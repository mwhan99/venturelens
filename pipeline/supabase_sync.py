#!/usr/bin/env python3
"""Copy the Form D rounds into Supabase for the website's company lookup.

Reads pipeline/data/processed/rounds.parquet (every filer, startup or not),
venture_rounds.parquet and likely_non_startups.csv (to say whether each
company is in the benchmark and why not), pipeline/brand_aliases.csv, and the
dataset end date in src/data/formd/benchmarks.json. Run it after the rest of
the pipeline. The tables are defined in supabase/schema.sql.

Settings come from the environment or pipeline/.env (git-ignored):
    SUPABASE_URL=https://<project>.supabase.co
    SUPABASE_SECRET_KEY=<the project's secret key, sb_secret_...>

    python pipeline/supabase_sync.py --dry-run   # build everything, send nothing
    python pipeline/supabase_sync.py             # upload, then check the counts

Uploads are upserts (insert, or update if the row exists), so running it
twice is safe. Rows left over from an older upload are deleted at the end.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests

from build_dataset import _industry_status

PIPELINE_DIR = Path(__file__).resolve().parent
ROOT = PIPELINE_DIR.parent
PROCESSED_DIR = PIPELINE_DIR / "data" / "processed"
ROUNDS_PATH = PROCESSED_DIR / "rounds.parquet"
VENTURE_PATH = PROCESSED_DIR / "venture_rounds.parquet"
NON_STARTUPS_PATH = PROCESSED_DIR / "likely_non_startups.csv"
ALIASES_PATH = PIPELINE_DIR / "brand_aliases.csv"
BENCHMARKS_PATH = ROOT / "src" / "data" / "formd" / "benchmarks.json"
ENV_PATH = PIPELINE_DIR / ".env"

BATCH_SIZE = 2000
TIMEOUT_SECONDS = 120
PRIMARY_KEYS = {
    "filers": ("cik",),
    "filer_names": ("cik", "name"),
    "rounds": ("cik", "round_number"),
    "sync_info": ("id",),
}
# Children first, so a deleted filer never leaves orphans behind.
PRUNE_ORDER = ("filer_names", "rounds", "filers")

STATUS_DETAIL = {
    "not_young": "Its first round in this data was before 2010, or it reported being over about five years old then.",
    "non_venture_industry": "Its Form D industry isn't one of the venture sectors (for example real estate, oil and gas, or investing).",
    "no_completed_round": "It never reported selling anything (every amount sold is $0 or blank).",
    "other_legal_form": "It isn't a corporation or LLC (for example a partnership or trust).",
}


# ---------------------------------------------------------------------------
# Building the rows
# ---------------------------------------------------------------------------


def normalize_name(name: str) -> str:
    """Lower case, punctuation removed, spaces collapsed. Matches search_filers() in schema.sql."""
    text = re.sub(r"[^a-z0-9 ]", "", str(name).lower())
    return re.sub(r"\s+", " ", text).strip()


def clean(value):
    """JSON-safe value: NaN/NA become None, numpy numbers become Python numbers."""
    if value is None or value is pd.NA or value is pd.NaT:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if isinstance(value, pd.Timestamp):
        return value.date().isoformat()
    if hasattr(value, "item"):
        value = value.item()
        if isinstance(value, float) and math.isnan(value):
            return None
    return value


def benchmark_status(
    cik: str,
    *,
    is_startup: bool,
    industry: object,
    completed_rounds: int,
    venture_ciks: set[str],
    excluded: dict[str, str],
) -> tuple[str, str | None]:
    """Whether a filer is in the benchmark, and if not, the first reason that applies."""
    if cik in venture_ciks:
        return "benchmark", None
    if cik in excluded:
        return "likely_non_startup", excluded[cik]
    if not is_startup:
        return "not_young", STATUS_DETAIL["not_young"]
    if _industry_status(industry) in {"EXCLUDE", "UNMAPPED"}:
        return "non_venture_industry", STATUS_DETAIL["non_venture_industry"]
    if completed_rounds == 0:
        return "no_completed_round", STATUS_DETAIL["no_completed_round"]
    return "other_legal_form", STATUS_DETAIL["other_legal_form"]


def build_tables(
    rounds: pd.DataFrame,
    venture: pd.DataFrame,
    non_startups: pd.DataFrame,
    aliases: pd.DataFrame,
    synced_at: str,
) -> dict[str, list[dict[str, object]]]:
    rounds = rounds.sort_values(["cik", "observed_round_number"], kind="mergesort")
    venture_sector = venture.groupby("cik")["venture_sector"].first().to_dict()
    venture_ciks = set(venture_sector)
    excluded = dict(zip(non_startups["cik"], non_startups["detail"]))

    grouped = rounds.groupby("cik", sort=True)
    per_filer = grouped.agg(
        name=("entity_name", "last"),
        state=("state", "last"),
        industry=("company_industry", "first"),
        is_startup=("is_startup", "first"),
        first_event_date=("event_date", "min"),
        last_event_date=("event_date", "max"),
        round_count=("cik", "size"),
    )
    per_filer["completed_round_count"] = grouped["amount_sold"].apply(lambda s: int((s.fillna(0) > 0).sum()))

    filers = []
    for cik, row in per_filer.iterrows():
        status, detail = benchmark_status(
            cik,
            is_startup=bool(row["is_startup"]),
            industry=row["industry"],
            completed_rounds=int(row["completed_round_count"]),
            venture_ciks=venture_ciks,
            excluded=excluded,
        )
        # Only benchmark companies get a sector; for the rest it would suggest
        # they're counted in it.
        sector = venture_sector.get(cik)
        filers.append(
            {
                "cik": cik,
                "name": clean(row["name"]),
                "state": clean(row["state"]),
                "industry": clean(row["industry"]),
                "venture_sector": sector,
                "first_event_date": clean(row["first_event_date"]),
                "last_event_date": clean(row["last_event_date"]),
                "round_count": int(row["round_count"]),
                "completed_round_count": int(row["completed_round_count"]),
                "benchmark_status": status,
                "status_detail": detail,
                "synced_at": synced_at,
            }
        )

    names: dict[tuple[str, str], dict[str, object]] = {}
    for cik, name in rounds[["cik", "entity_name"]].drop_duplicates().itertuples(index=False):
        if isinstance(name, str) and name.strip():
            names[(cik, name)] = {"cik": cik, "name": name, "normalized": normalize_name(name), "source": "filing", "synced_at": synced_at}
    known = set(per_filer.index)
    for alias in aliases.itertuples(index=False):
        if alias.cik not in known:
            raise SystemExit(f"ERROR: brand_aliases.csv lists {alias.cik} ({alias.brand}), which is not a Form D filer.")
        names[(alias.cik, alias.brand)] = {
            "cik": alias.cik,
            "name": alias.brand,
            "normalized": normalize_name(alias.brand),
            "source": "brand",
            "synced_at": synced_at,
        }

    round_rows = [
        {
            "cik": r.cik,
            "round_number": int(r.observed_round_number),
            "event_date": clean(r.event_date),
            "event_date_source": clean(r.event_date_source),
            "amount_sold": clean(r.amount_sold),
            "amount_bucket": clean(r.amount_bucket),
            "investor_count": clean(r.investor_count),
            "industry": clean(r.industry),
            "revenue_range": clean(r.revenue_range),
            "months_since_previous": clean(r.months_since_previous_round),
            "months_to_next": clean(r.months_to_next_round),
            "n_offerings": clean(r.n_offerings),
            "synced_at": synced_at,
        }
        for r in rounds.itertuples(index=False)
    ]
    return {"filers": filers, "filer_names": list(names.values()), "rounds": round_rows}


def check_tables(tables: dict[str, list[dict[str, object]]], venture: pd.DataFrame) -> None:
    """Stop before sending anything if the tables don't add up."""
    filers = tables["filers"]
    in_benchmark = sum(1 for f in filers if f["benchmark_status"] == "benchmark")
    if in_benchmark != venture["cik"].nunique():
        raise SystemExit(f"ERROR: {in_benchmark:,} filers marked benchmark, but venture_rounds.parquet has {venture['cik'].nunique():,} companies.")
    if sum(int(f["round_count"]) for f in filers) != len(tables["rounds"]):
        raise SystemExit("ERROR: the filers' round counts don't add up to the rounds table.")
    ciks = {f["cik"] for f in filers}
    if any(n["cik"] not in ciks for n in tables["filer_names"]):
        raise SystemExit("ERROR: a name belongs to a CIK that isn't a filer.")


def load_inputs():
    for path, script in (
        (ROUNDS_PATH, "pipeline/build_dataset.py"),
        (VENTURE_PATH, "pipeline/build_dataset.py"),
        (NON_STARTUPS_PATH, "pipeline/build_dataset.py"),
        (BENCHMARKS_PATH, "pipeline/analyze.py"),
    ):
        if not path.exists():
            raise SystemExit(f"ERROR: {path} does not exist. Run {script} first.")
    rounds = pd.read_parquet(ROUNDS_PATH)
    venture = pd.read_parquet(VENTURE_PATH, columns=["cik", "venture_sector"])
    non_startups = pd.read_csv(NON_STARTUPS_PATH, dtype={"cik": str})
    aliases = pd.read_csv(ALIASES_PATH, dtype={"cik": str})
    end_date = json.loads(BENCHMARKS_PATH.read_text(encoding="utf-8"))["dataset_end_date"]
    return rounds, venture, non_startups, aliases, end_date


# ---------------------------------------------------------------------------
# Supabase
# ---------------------------------------------------------------------------


def read_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def settings() -> tuple[str, str]:
    env_file = read_env_file(ENV_PATH)
    url = os.environ.get("SUPABASE_URL") or env_file.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SECRET_KEY") or env_file.get("SUPABASE_SECRET_KEY")
    if not url or not key:
        raise SystemExit(
            "ERROR: SUPABASE_URL and SUPABASE_SECRET_KEY are not set. Put them in pipeline/.env "
            "(it is git-ignored) or in the environment."
        )
    if not key.startswith(("sb_secret_", "eyJ")):
        raise SystemExit("ERROR: SUPABASE_SECRET_KEY doesn't look like a secret key (it should start with sb_secret_).")
    return base_url(url), key


def base_url(url: str) -> str:
    """Accept the project URL with or without /rest/v1/."""
    url = url.strip().rstrip("/")
    return url[: -len("/rest/v1")] if url.endswith("/rest/v1") else url


def headers(key: str) -> dict[str, str]:
    """New-style secret keys (sb_secret_...) go only in the apikey header; older JWT keys also go in Authorization."""
    result = {"apikey": key, "Content-Type": "application/json"}
    if key.startswith("eyJ"):
        result["Authorization"] = f"Bearer {key}"
    return result


def check(response: requests.Response, action: str) -> None:
    if response.status_code >= 300:
        raise SystemExit(f"ERROR: {action} failed ({response.status_code}): {response.text[:500]}")


def upsert(session: requests.Session, url: str, table: str, rows: list[dict[str, object]]) -> None:
    params = {"on_conflict": ",".join(PRIMARY_KEYS[table])}
    for start in range(0, len(rows), BATCH_SIZE):
        batch = rows[start : start + BATCH_SIZE]
        response = session.post(
            f"{url}/rest/v1/{table}",
            params=params,
            data=json.dumps(batch),
            headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
            timeout=TIMEOUT_SECONDS,
        )
        check(response, f"uploading {table} rows {start:,}–{start + len(batch):,}")
        done = min(start + BATCH_SIZE, len(rows))
        if done == len(rows) or (done // BATCH_SIZE) % 20 == 0:
            print(f"  {table}: {done:,} / {len(rows):,}")


def prune(session: requests.Session, url: str, table: str, synced_at: str) -> None:
    """Delete rows from an older upload (anything not touched by this run)."""
    response = session.delete(
        f"{url}/rest/v1/{table}",
        params={"synced_at": f"lt.{synced_at}"},
        headers={"Prefer": "return=minimal"},
        timeout=TIMEOUT_SECONDS,
    )
    check(response, f"removing old {table} rows")


def count_rows(session: requests.Session, url: str, table: str) -> int:
    response = session.get(
        f"{url}/rest/v1/{table}",
        params={"select": PRIMARY_KEYS[table][0]},
        headers={"Prefer": "count=exact", "Range": "0-0"},
        timeout=TIMEOUT_SECONDS,
    )
    check(response, f"counting {table}")
    return int(response.headers["Content-Range"].split("/")[-1])


def send(tables: dict[str, list[dict[str, object]]], end_date: str, synced_at: str) -> None:
    url, key = settings()
    session = requests.Session()
    session.headers.update(headers(key))
    for table in ("filers", "filer_names", "rounds"):
        upsert(session, url, table, tables[table])
    for table in PRUNE_ORDER:
        prune(session, url, table, synced_at)
    info = {
        "id": 1,
        "dataset_end_date": end_date,
        "filers": len(tables["filers"]),
        "rounds": len(tables["rounds"]),
        "names": len(tables["filer_names"]),
        "synced_at": synced_at,
    }
    upsert(session, url, "sync_info", [info])

    print()
    mismatches = []
    for table in ("filers", "filer_names", "rounds"):
        remote = count_rows(session, url, table)
        local = len(tables[table])
        print(f"{table:<12} local {local:>8,}   in Supabase {remote:>8,}")
        if remote != local:
            mismatches.append(table)
    if mismatches:
        raise SystemExit(f"ERROR: row counts differ for {', '.join(mismatches)}.")
    print("All row counts match.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--dry-run", action="store_true", help="build the tables and print counts without sending")
    args = parser.parse_args()

    synced_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    rounds, venture, non_startups, aliases, end_date = load_inputs()
    tables = build_tables(rounds, venture, non_startups, aliases, synced_at)
    check_tables(tables, venture)

    statuses = pd.Series([f["benchmark_status"] for f in tables["filers"]]).value_counts()
    print(f"Data through {end_date}")
    print(f"filers {len(tables['filers']):,}   names {len(tables['filer_names']):,}   rounds {len(tables['rounds']):,}")
    for status, n in statuses.items():
        print(f"  {status:<22} {n:>8,}")
    if args.dry_run:
        print("Dry run: nothing was sent.")
        return 0
    send(tables, end_date, synced_at)
    return 0


if __name__ == "__main__":
    sys.exit(main())
