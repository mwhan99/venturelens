#!/usr/bin/env python3
"""Headline numbers for the VentureLens website from the Form D venture rounds.

Reads pipeline/data/processed/venture_rounds.parquet and funnel.json (both from
build_dataset.py) and the dataset end date in src/data/formd/benchmarks.json
(from analyze.py), so run it after those two scripts. Writes
src/data/formd/summary.json. It does not change any other file.

Everything here is a plain count or median of completed venture rounds. The
survival statistics stay in analyze.py. Dollar totals are left out on purpose:
amounts are self-reported, and a few filings (a $48B round with one investor,
private-equity vehicles that passed the fund filter) would dominate any sum.
Medians are not moved by them.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

from build_dataset import (
    ESTABLISHED_REVENUE_RANGE,
    ROUND_MERGE_WINDOW_DAYS,
    STARTUP_FIRST_ROUND_ON_OR_AFTER,
    YOUNG_COMPANY_YEARS,
)

ROOT = Path(__file__).resolve().parents[1]
PROCESSED_DIR = ROOT / "pipeline" / "data" / "processed"
ROUNDS_PATH = PROCESSED_DIR / "venture_rounds.parquet"
FUNNEL_PATH = PROCESSED_DIR / "funnel.json"
NON_STARTUPS_PATH = PROCESSED_DIR / "likely_non_startups.csv"
EXCLUSION_RULE_ORDER = ("vehicle_name", "established_revenue", "reviewed")
BENCHMARKS_PATH = ROOT / "src" / "data" / "formd" / "benchmarks.json"
SUMMARY_PATH = ROOT / "src" / "data" / "formd" / "summary.json"

TOP_STATES = 10
BUCKET_ORDER = ("<$1M", "$1–5M", "$5–20M", "$20M+")
MAX_SUMMARY_BYTES = 100 * 1024


def _median(values: pd.Series) -> int | None:
    """Median rounded to whole dollars, or None for an empty series."""
    values = values.dropna()
    if values.empty:
        return None
    return int(round(float(values.median())))


def sector_order(rounds: pd.DataFrame) -> list[str]:
    """Sectors by number of rounds, largest first; ties by name."""
    counts = rounds["venture_sector"].value_counts()
    return sorted(counts.index, key=lambda sector: (-int(counts[sector]), sector))


def headline(rounds: pd.DataFrame) -> dict[str, object]:
    years = rounds["event_date"].dt.year
    return {
        "rounds": int(len(rounds)),
        "companies": int(rounds["cik"].nunique()),
        "median_amount_sold": _median(rounds["amount_sold"]),
        "states": int(rounds["state"].nunique()),
        "first_year": int(years.min()),
        "last_year": int(years.max()),
    }


def by_year(rounds: pd.DataFrame, end_date: pd.Timestamp) -> list[dict[str, object]]:
    """One record per calendar year. A company counts once in each year it raised.

    The year that contains end_date is marked partial unless end_date is Dec 31,
    so a chart can show it differently instead of reading it as a decline.
    """
    sectors = sector_order(rounds)
    years = rounds["event_date"].dt.year
    records = []
    for year, group in rounds.groupby(years, sort=True):
        counts = group["venture_sector"].value_counts()
        records.append(
            {
                "year": int(year),
                "rounds": int(len(group)),
                "companies": int(group["cik"].nunique()),
                "median_amount_sold": _median(group["amount_sold"]),
                "rounds_by_sector": {sector: int(counts.get(sector, 0)) for sector in sectors},
                "partial": bool(
                    int(year) == end_date.year and (end_date.month, end_date.day) != (12, 31)
                ),
            }
        )
    return records


def by_sector(rounds: pd.DataFrame) -> list[dict[str, object]]:
    total = len(rounds)
    records = []
    for sector in sector_order(rounds):
        group = rounds.loc[rounds["venture_sector"].eq(sector)]
        records.append(
            {
                "venture_sector": sector,
                "rounds": int(len(group)),
                "companies": int(group["cik"].nunique()),
                "share_of_rounds": round(len(group) / total, 4),
                "median_amount_sold": _median(group["amount_sold"]),
            }
        )
    return records


def by_amount_bucket(rounds: pd.DataFrame) -> list[dict[str, object]]:
    total = len(rounds)
    counts = rounds["amount_bucket"].value_counts()
    return [
        {
            "amount_bucket": bucket,
            "rounds": int(counts.get(bucket, 0)),
            "share_of_rounds": round(int(counts.get(bucket, 0)) / total, 4),
        }
        for bucket in BUCKET_ORDER
    ]


def top_states(rounds: pd.DataFrame, limit: int = TOP_STATES) -> list[dict[str, object]]:
    total = len(rounds)
    grouped = rounds.groupby("state").agg(rounds=("cik", "size"), companies=("cik", "nunique"))
    grouped = grouped.reset_index().sort_values(["rounds", "state"], ascending=[False, True])
    return [
        {
            "state": str(row.state),
            "rounds": int(row.rounds),
            "companies": int(row.companies),
            "share_of_rounds": round(int(row.rounds) / total, 4),
        }
        for row in grouped.head(limit).itertuples(index=False)
    ]


def funnel_with_shares(funnel: list[dict[str, object]]) -> list[dict[str, object]]:
    """Add each step's companies as a share of the previous step and of the first."""
    if not funnel:
        raise SystemExit("ERROR: funnel.json is empty.")
    first = int(funnel[0]["companies"])
    records = []
    previous: int | None = None
    for step in funnel:
        companies = int(step["companies"])
        records.append(
            {
                **step,
                "share_of_previous": None if not previous else round(companies / previous, 4),
                "share_of_all": round(companies / first, 4) if first else None,
            }
        )
        previous = companies
    return records


def cleaning_rules() -> dict[str, object]:
    """The rule settings from build_dataset.py, so the website never types them by hand."""
    return {
        "round_merge_window_days": ROUND_MERGE_WINDOW_DAYS,
        "startup_first_round_on_or_after": STARTUP_FIRST_ROUND_ON_OR_AFTER.date().isoformat(),
        "young_company_years": YOUNG_COMPANY_YEARS,
        "established_revenue_range": ESTABLISHED_REVENUE_RANGE,
    }


def exclusion_counts(non_startups: pd.DataFrame | None) -> list[dict[str, object]]:
    """Companies and rounds dropped by each likely-startup rule (likely_non_startups.csv)."""
    if non_startups is None or non_startups.empty:
        return []
    grouped = non_startups.groupby("rule").agg(companies=("cik", "nunique"), rounds=("rounds", "sum"))
    return [
        {"rule": rule, "companies": int(grouped.loc[rule, "companies"]), "rounds": int(grouped.loc[rule, "rounds"])}
        for rule in EXCLUSION_RULE_ORDER
        if rule in grouped.index
    ]


def build_summary(
    rounds: pd.DataFrame,
    funnel: list[dict[str, object]],
    end_date: pd.Timestamp,
    non_startups: pd.DataFrame | None = None,
) -> dict[str, object]:
    return {
        "dataset_end_date": end_date.date().isoformat(),
        "definition": (
            "Completed venture rounds: US startups in venture-relevant sectors, offerings "
            "within 90 days merged into one round, amount sold greater than zero. "
            "Amounts are what the issuer reported on Form D."
        ),
        "headline": headline(rounds),
        "funnel": funnel_with_shares(funnel),
        "by_year": by_year(rounds, end_date),
        "by_sector": by_sector(rounds),
        "by_amount_bucket": by_amount_bucket(rounds),
        "top_states": top_states(rounds),
        "rules": cleaning_rules(),
        "exclusions": exclusion_counts(non_startups),
    }


def load_inputs() -> tuple[pd.DataFrame, list[dict[str, object]], pd.Timestamp, pd.DataFrame]:
    for path, script in (
        (ROUNDS_PATH, "pipeline/build_dataset.py"),
        (FUNNEL_PATH, "pipeline/build_dataset.py"),
        (NON_STARTUPS_PATH, "pipeline/build_dataset.py"),
        (BENCHMARKS_PATH, "pipeline/analyze.py"),
    ):
        if not path.exists():
            raise SystemExit(f"ERROR: {path} does not exist. Run {script} first.")
    rounds = pd.read_parquet(ROUNDS_PATH)
    rounds["event_date"] = pd.to_datetime(rounds["event_date"])
    funnel = json.loads(FUNNEL_PATH.read_text(encoding="utf-8"))
    end_date = pd.Timestamp(json.loads(BENCHMARKS_PATH.read_text(encoding="utf-8"))["dataset_end_date"])
    non_startups = pd.read_csv(NON_STARTUPS_PATH, dtype={"cik": str})
    return rounds, funnel, end_date, non_startups


def check_consistency(summary: dict[str, object], funnel: list[dict[str, object]]) -> None:
    """The last funnel step and the rounds file must describe the same dataset."""
    last = funnel[-1]
    head = summary["headline"]
    if (int(last["rows"]), int(last["companies"])) != (head["rounds"], head["companies"]):
        raise SystemExit(
            "ERROR: funnel.json and venture_rounds.parquet disagree "
            f"({last['rows']:,} vs {head['rounds']:,} rounds). Re-run pipeline/build_dataset.py."
        )


def main() -> int:
    rounds, funnel, end_date, non_startups = load_inputs()
    summary = build_summary(rounds, funnel, end_date, non_startups)
    check_consistency(summary, funnel)
    SUMMARY_PATH.parent.mkdir(parents=True, exist_ok=True)
    SUMMARY_PATH.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    head = summary["headline"]
    print(
        f"Rounds {head['rounds']:,}  companies {head['companies']:,}  "
        f"{head['first_year']}–{head['last_year']}  through {summary['dataset_end_date']}"
    )
    print(f"Median round ${head['median_amount_sold']:,}  states {head['states']}")
    print()
    print(f"{'Year':<6} {'Rounds':>8} {'Companies':>10} {'Median round':>14}")
    for record in summary["by_year"]:
        note = "  (partial year)" if record["partial"] else ""
        print(
            f"{record['year']:<6} {record['rounds']:>8,} {record['companies']:>10,} "
            f"{'$' + format(record['median_amount_sold'], ','):>14}{note}"
        )
    size_bytes = SUMMARY_PATH.stat().st_size
    print()
    print(f"Wrote {SUMMARY_PATH} ({size_bytes:,} bytes)")
    if size_bytes > MAX_SUMMARY_BYTES:
        raise SystemExit(f"ERROR: summary.json is {size_bytes / 1024:.1f} KB, above the 100 KB limit.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
