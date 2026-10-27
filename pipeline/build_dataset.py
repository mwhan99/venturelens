#!/usr/bin/env python3
"""Build a startup fundraising-round dataset from downloaded SEC Form D files.

Run pipeline/download.py first. This script does not download anything.
"""

from __future__ import annotations

import csv
import io
import json
import re
import sys
from bisect import bisect_right
from collections import defaultdict
from datetime import datetime
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    sys.exit(
        "ERROR: pandas is not installed.\n"
        "Create the pipeline virtualenv and install dependencies:\n"
        "  python3 -m venv pipeline/.venv\n"
        "  pipeline/.venv/bin/pip install -r pipeline/requirements.txt"
    )

# Offerings from the same company whose event dates fall inside this window
# are treated as one funding round. See DECISIONS.md for why it is anchored
# to the first date in the round (the cluster spans at most this many days).
ROUND_MERGE_WINDOW_DAYS = 90
DAYS_PER_MONTH = 30.4375
# A first observed round before this date is not treated as a startup round.
# The extract starts in 2008, so an earlier "first" round is more likely to
# hide a raise that predates the files.
STARTUP_FIRST_ROUND_ON_OR_AFTER = pd.Timestamp("2010-01-01")
YOUNG_COMPANY_YEARS = 5
# Names that private-equity buyouts, SPACs and fund vehicles use. A buyout
# creates a new company, so it passes the young-company test above.
VEHICLE_NAME_PATTERN = re.compile(
    r"\b(?:top ?co|hold ?co|mid ?co|bid ?co|parent|conglomerate|intermediate"
    r"|acquisition corp(?:oration)?|merger sub)\b",
    re.IGNORECASE,
)
# A startup does not report this much revenue at its first observed round.
ESTABLISHED_REVENUE_RANGE = "Over $100,000,000"

PIPELINE_DIR = Path(__file__).resolve().parent
# Hand-reviewed companies that the two rules above miss. One reason per row.
EXCLUDED_COMPANIES_PATH = PIPELINE_DIR / "excluded_companies.csv"
RAW_DIR = PIPELINE_DIR / "data" / "raw"
PROCESSED_DIR = PIPELINE_DIR / "data" / "processed"

SUBMISSION_COLUMNS = ["ACCESSIONNUMBER", "FILING_DATE", "SUBMISSIONTYPE"]
ISSUER_COLUMNS = [
    "ACCESSIONNUMBER",
    "IS_PRIMARYISSUER_FLAG",
    "CIK",
    "ENTITYNAME",
    "STATEORCOUNTRY",
    "JURISDICTIONOFINC",
    "ENTITYTYPE",
    "YEAROFINC_TIMESPAN_CHOICE",
    "YEAROFINC_VALUE_ENTERED",
]
OFFERING_COLUMNS = [
    "ACCESSIONNUMBER",
    "INDUSTRYGROUPTYPE",
    "INVESTMENTFUNDTYPE",
    "ISPOOLEDINVESTMENTFUNDTYPE",
    "REVENUERANGE",
    "ISAMENDMENT",
    "PREVIOUSACCESSIONNUMBER",
    "SALE_DATE",
    "YETTOOCCUR",
    "ISEQUITYTYPE",
    "ISDEBTTYPE",
    "TOTALOFFERINGAMOUNT",
    "TOTALAMOUNTSOLD",
    "TOTALNUMBERALREADYINVESTED",
]
TABLES = {
    "FORMDSUBMISSION": SUBMISSION_COLUMNS,
    "ISSUERS": ISSUER_COLUMNS,
    "OFFERING": OFFERING_COLUMNS,
}

US_STATE_CODES = frozenset(
    {
        "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL",
        "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
        "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
        "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
        "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
    }
)
STATE_NAME_TO_CODE = {
    "ALABAMA": "AL",
    "ALASKA": "AK",
    "ARIZONA": "AZ",
    "ARKANSAS": "AR",
    "CALIFORNIA": "CA",
    "COLORADO": "CO",
    "CONNECTICUT": "CT",
    "DELAWARE": "DE",
    "DISTRICT OF COLUMBIA": "DC",
    "WASHINGTON DC": "DC",
    "WASHINGTON, DC": "DC",
    "D.C.": "DC",
    "FLORIDA": "FL",
    "GEORGIA": "GA",
    "HAWAII": "HI",
    "IDAHO": "ID",
    "ILLINOIS": "IL",
    "INDIANA": "IN",
    "IOWA": "IA",
    "KANSAS": "KS",
    "KENTUCKY": "KY",
    "LOUISIANA": "LA",
    "MAINE": "ME",
    "MARYLAND": "MD",
    "MASSACHUSETTS": "MA",
    "MICHIGAN": "MI",
    "MINNESOTA": "MN",
    "MISSISSIPPI": "MS",
    "MISSOURI": "MO",
    "MONTANA": "MT",
    "NEBRASKA": "NE",
    "NEVADA": "NV",
    "NEW HAMPSHIRE": "NH",
    "NEW JERSEY": "NJ",
    "NEW MEXICO": "NM",
    "NEW YORK": "NY",
    "NORTH CAROLINA": "NC",
    "NORTH DAKOTA": "ND",
    "OHIO": "OH",
    "OKLAHOMA": "OK",
    "OREGON": "OR",
    "PENNSYLVANIA": "PA",
    "RHODE ISLAND": "RI",
    "SOUTH CAROLINA": "SC",
    "SOUTH DAKOTA": "SD",
    "TENNESSEE": "TN",
    "TEXAS": "TX",
    "UTAH": "UT",
    "VERMONT": "VT",
    "VIRGINIA": "VA",
    "WASHINGTON": "WA",
    "WEST VIRGINIA": "WV",
    "WISCONSIN": "WI",
    "WYOMING": "WY",
}
_MONTHS = {
    "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6,
    "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12,
}
_TRUE_VALUES = {"true", "t", "yes", "y", "1"}
_BLANK_TOKENS = {"", "nan", "none", "null", "nat", "<na>"}

# Form D INDUSTRYGROUPTYPE -> VentureLens sector.
# None means the industry is explicitly excluded (real estate, SPVs, resources).
# "Other" is its own sector, Other/Unclassified. It is a mixed residual bucket,
# not a guessed assignment to Technology or any other sector.
# A value seen in the data and missing from this dict is UNMAPPED: it is not given a sector.
# The form's travel group is three labels in the file, not one "Travel/Lodging/Tourism" value.
# FinTech industries are reached only after pooled investment funds have already been dropped.
VENTURE_SECTOR_BY_INDUSTRY: dict[str, str | None] = {
    "Computers": "Technology",
    "Telecommunications": "Technology",
    "Other Technology": "Technology",
    "Biotechnology": "HealthTech/Biotech",
    "Pharmaceuticals": "HealthTech/Biotech",
    "Health Insurance": "HealthTech/Biotech",
    "Hospitals and Physicians": "HealthTech/Biotech",
    "Other Health Care": "HealthTech/Biotech",
    "Commercial Banking": "FinTech",
    "Insurance": "FinTech",
    "Investment Banking": "FinTech",
    "Other Banking and Financial Services": "FinTech",
    "Electric Utilities": "Energy/ClimateTech",
    "Energy Conservation": "Energy/ClimateTech",
    "Environmental Services": "Energy/ClimateTech",
    "Other Energy": "Energy/ClimateTech",
    "Retailing": "Consumer",
    "Restaurants": "Consumer",
    "Lodging and Conventions": "Consumer",
    "Other Travel": "Consumer",
    "Tourism and Travel Services": "Consumer",
    "Agriculture": "Consumer",
    "Manufacturing": "Consumer",
    "Business Services": "Consumer",
    "Commercial": None,
    "Construction": None,
    "REITS and Finance": None,
    "Residential": None,
    "Other Real Estate": None,
    "Investing": None,
    "Oil and Gas": None,
    "Coal Mining": None,
    "Airlines and Airports": None,
    "Other": "Other/Unclassified",
}
# Keep operating-company entity types. Partnerships and business trusts are
# usually deal vehicles or funds. Anything else (including "Other") is not kept.
VENTURE_ENTITY_TYPES = frozenset({"Corporation", "Limited Liability Company"})
EXCLUDED_ENTITY_TYPES = frozenset(
    {"Limited Partnership", "General Partnership", "Business Trust"}
)

FINAL_COLUMNS = [
    "cik",
    "entity_name",
    "state",
    "industry",
    "company_industry",
    "revenue_range",
    "event_date",
    "event_date_source",
    "amount_sold",
    "amount_bucket",
    "investor_count",
    "observed_round_number",
    "is_startup",
    "months_since_previous_round",
    "months_to_next_round",
    "is_censored",
    "n_offerings",
]
VENTURE_COLUMNS = [
    "cik",
    "entity_name",
    "state",
    "industry",
    "company_industry",
    "venture_sector",
    "revenue_range",
    "event_date",
    "event_date_source",
    "amount_sold",
    "amount_bucket",
    "investor_count",
    "observed_round_number",
    "is_startup",
    "is_venture",
    "months_since_previous_round",
    "months_to_next_round",
    "is_censored",
    "n_offerings",
]
_VENTURE_SECTOR_NAMES = (
    "Technology",
    "HealthTech/Biotech",
    "FinTech",
    "Energy/ClimateTech",
    "Consumer",
    "Other/Unclassified",
)


class QualityReport:
    def __init__(self) -> None:
        self.file_stats: list[dict[str, object]] = []
        self.steps: list[dict[str, object]] = []
        self.notes: list[str] = []

    def add_file(self, quarter: str, table: str, path: Path, rows: int, skipped: int, encoding: str) -> None:
        self.file_stats.append(
            {
                "quarter": quarter,
                "table": table,
                "file": str(path.relative_to(RAW_DIR)),
                "rows": rows,
                "skipped": skipped,
                "encoding": encoding,
            }
        )
        skip_note = f", skipped {skipped:,} malformed" if skipped else ""
        print(f"  {table}: {rows:,} rows{skip_note} [{encoding}]")

    def add_step(self, name: str, before: int, after: int, unit: str = "rows") -> None:
        removed = before - after
        percent = (removed / before * 100.0) if before else 0.0
        self.steps.append(
            {
                "name": name,
                "before": before,
                "after": after,
                "removed": removed,
                "percent": percent,
                "unit": unit,
            }
        )
        print(
            f"[step] {name}: {before:,} -> {after:,} {unit} "
            f"(removed {removed:,}, {percent:.1f}%)"
        )

    def note(self, text: str) -> None:
        self.notes.append(text)
        print(text)


def find_table(quarter_dir: Path, table: str) -> Path | None:
    matches: list[Path] = []
    for path in quarter_dir.rglob("*"):
        if not path.is_file() or "__MACOSX" in path.parts:
            continue
        if path.suffix.lower() not in {".tsv", ".txt"}:
            continue
        if path.stem.upper() == table:
            matches.append(path)
    if not matches:
        return None
    matches.sort(key=lambda path: (path.suffix.lower() != ".tsv", str(path)))
    return matches[0]


def quarter_sort_key(name: str) -> tuple[int, int, str]:
    match = re.search(r"(\d{4})q([1-4])", name, re.IGNORECASE)
    if not match:
        return (9999, 9, name.lower())
    return (int(match.group(1)), int(match.group(2)), name.lower())


def read_tsv(path: Path, columns: list[str]) -> tuple[pd.DataFrame, int, str]:
    """Read selected columns as strings. Malformed lines are skipped, not fatal."""
    attempts = (("utf-8-sig", "strict"), ("cp1252", "strict"), ("latin-1", "strict"))
    last_error: UnicodeDecodeError | None = None
    for encoding, errors in attempts:
        try:
            text = path.read_text(encoding=encoding, errors=errors)
        except UnicodeDecodeError as exc:
            last_error = exc
            continue
        frame, skipped, missing = _parse_tsv_text(text, columns)
        if missing:
            print(f"  warning: {path.name} is missing columns, filled with null: {', '.join(missing)}")
        used = encoding if errors == "strict" else f"{encoding}/{errors}"
        return frame, skipped, used
    raise UnicodeDecodeError(
        "utf-8",
        b"",
        0,
        1,
        f"Could not decode {path} ({last_error})",
    )


def _parse_tsv_text(text: str, columns: list[str]) -> tuple[pd.DataFrame, int, list[str]]:
    reader = csv.reader(io.StringIO(text), delimiter="\t")
    try:
        header = next(reader)
    except StopIteration:
        return pd.DataFrame(columns=columns), 0, list(columns)
    header = [name.strip().lstrip("\ufeff").upper() for name in header]
    positions = {name: index for index, name in enumerate(header)}
    missing = [column for column in columns if column not in positions]
    indexes = [positions.get(column) for column in columns]
    expected = len(header)
    rows: list[tuple[str, ...]] = []
    skipped = 0
    for row in reader:
        if len(row) != expected:
            skipped += 1
            continue
        rows.append(tuple("" if index is None else row[index] for index in indexes))
    if not rows:
        frame = pd.DataFrame({column: pd.Series(dtype="object") for column in columns})
        return frame, skipped, missing
    frame = pd.DataFrame.from_records(rows, columns=columns)
    for column in frame.columns:
        frame[column] = frame[column].str.strip()
    frame = frame.replace({"": pd.NA})
    return frame, skipped, missing


def list_quarter_dirs() -> list[Path]:
    if not RAW_DIR.exists():
        return []
    quarters = [path for path in RAW_DIR.iterdir() if path.is_dir() and not path.name.startswith(".")]
    quarters.sort(key=lambda path: quarter_sort_key(path.name))
    return quarters


def load_tables(report: QualityReport) -> dict[str, pd.DataFrame]:
    quarters = list_quarter_dirs()
    if not quarters:
        raise SystemExit(
            f"ERROR: No extracted quarters in {RAW_DIR}.\n"
            "Run python pipeline/download.py first."
        )
    collected: dict[str, list[pd.DataFrame]] = {name: [] for name in TABLES}
    print(f"Loading {len(quarters)} quarters from {RAW_DIR}")
    for quarter_dir in quarters:
        paths = {table: find_table(quarter_dir, table) for table in TABLES}
        missing_tables = [table for table, path in paths.items() if path is None]
        if missing_tables:
            report.note(
                f"Skipped {quarter_dir.name}: missing {', '.join(missing_tables)}"
            )
            continue
        print(f"{quarter_dir.name}")
        year, qtr, _ = quarter_sort_key(quarter_dir.name)
        sort_value = year * 10 + qtr
        for table, columns in TABLES.items():
            path = paths[table]
            assert path is not None
            frame, skipped, encoding = read_tsv(path, columns)
            frame["quarter"] = quarter_dir.name
            frame["quarter_sort"] = sort_value
            collected[table].append(frame)
            report.add_file(quarter_dir.name, table, path, len(frame), skipped, encoding)
    tables = {}
    for name, frames in collected.items():
        if not frames:
            raise SystemExit(f"ERROR: No {name} files were loaded.")
        tables[name] = pd.concat(frames, ignore_index=True)
    return tables


def parse_bool(series: pd.Series) -> pd.Series:
    return series.fillna("").astype(str).str.strip().str.lower().isin(_TRUE_VALUES)


def parse_dates(series: pd.Series) -> pd.Series:
    """Parse SEC dates. Quarters mix YYYY-MM-DD[ time] and DD-MON-YYYY."""
    raw = series.fillna("").astype(str).str.strip()
    blank = raw.str.lower().isin(_BLANK_TOKENS)
    raw = raw.mask(blank, "")
    parsed = pd.Series(pd.NaT, index=series.index, dtype="datetime64[ns]")

    iso_mask = raw.str.match(r"^\d{4}-\d{2}-\d{2}")
    if iso_mask.any():
        parsed.loc[iso_mask] = pd.to_datetime(
            raw.loc[iso_mask].str.slice(0, 10), format="%Y-%m-%d", errors="coerce"
        )

    mon_mask = raw.str.match(r"^\d{1,2}-[A-Za-z]{3}-\d{4}") & parsed.isna()
    if mon_mask.any():
        parts = raw.loc[mon_mask].str.upper().str.extract(r"^(\d{1,2})-([A-Z]{3})-(\d{4})")
        month = parts[1].map(_MONTHS)
        valid = month.notna()
        if valid.any():
            stamped = pd.to_datetime(
                {
                    "year": parts.loc[valid, 2].astype(int),
                    "month": month.loc[valid].astype(int),
                    "day": parts.loc[valid, 0].astype(int),
                },
                errors="coerce",
            )
            parsed.loc[stamped.index] = stamped

    leftover = parsed.isna() & raw.ne("")
    if leftover.any():
        parsed.loc[leftover] = pd.to_datetime(raw.loc[leftover], errors="coerce", format="mixed")
    return parsed.dt.normalize()


def parse_number(series: pd.Series) -> tuple[pd.Series, int, int, int]:
    """Parse amounts. 'Indefinite' and blanks become null. Negatives become null."""
    raw = series.fillna("").astype(str).str.strip()
    raw = raw.str.replace(r"[\$,]", "", regex=True)
    lower = raw.str.lower()
    indefinite = lower.eq("indefinite")
    blank = lower.isin(_BLANK_TOKENS)
    numeric = pd.to_numeric(raw.mask(indefinite | blank), errors="coerce")
    negative = numeric.notna() & (numeric < 0)
    unparseable = ~indefinite & ~blank & ~negative & numeric.isna() & raw.ne("")
    numeric = numeric.mask(negative)
    return numeric, int(indefinite.sum()), int(unparseable.sum()), int(negative.sum())


def normalize_state(series: pd.Series) -> pd.Series:
    cleaned = series.fillna("").astype(str).str.strip().str.upper()
    mapped = cleaned.map(STATE_NAME_TO_CODE)
    normalized = mapped.fillna(cleaned)
    return normalized.mask(normalized.eq(""))


def normalize_cik(series: pd.Series) -> pd.Series:
    digits = series.fillna("").astype(str).str.replace(r"\D", "", regex=True)
    return digits.mask(digits.eq("")).str.zfill(10)


def drop_duplicate_accessions(frame: pd.DataFrame, label: str, report: QualityReport) -> pd.DataFrame:
    blank = int(frame["ACCESSIONNUMBER"].isna().sum())
    if blank:
        report.note(f"Dropped {blank:,} {label} rows with a blank ACCESSIONNUMBER.")
        frame = frame.loc[frame["ACCESSIONNUMBER"].notna()].copy()
    before = len(frame)
    ordered = frame.sort_values(["quarter_sort", "ACCESSIONNUMBER"], kind="mergesort")
    deduped = ordered.drop_duplicates("ACCESSIONNUMBER", keep="last")
    report.add_step(f"Drop duplicate {label} accessions", before, len(deduped), "rows")
    return deduped.reset_index(drop=True)


def without_load_meta(frame: pd.DataFrame) -> pd.DataFrame:
    return frame.drop(columns=[column for column in ("quarter", "quarter_sort", "_primary") if column in frame.columns])


def join_filings(tables: dict[str, pd.DataFrame], report: QualityReport) -> pd.DataFrame:
    submissions = drop_duplicate_accessions(tables["FORMDSUBMISSION"], "submission", report)
    issuers = tables["ISSUERS"]
    offerings = drop_duplicate_accessions(tables["OFFERING"], "offering", report)

    issuer_rows_before = len(issuers)
    issuers = issuers.copy()
    issuers["_primary"] = parse_bool(issuers["IS_PRIMARYISSUER_FLAG"])
    primary = issuers.loc[issuers["_primary"]].copy()
    report.add_step("Keep primary issuer rows", issuer_rows_before, len(primary), "issuer rows")
    blank_primary = int(primary["ACCESSIONNUMBER"].isna().sum())
    if blank_primary:
        report.note(f"Dropped {blank_primary:,} primary-issuer rows with a blank ACCESSIONNUMBER.")
        primary = primary.loc[primary["ACCESSIONNUMBER"].notna()].copy()

    before_primary_dedupe = len(primary)
    primary = primary.sort_values(["quarter_sort", "ACCESSIONNUMBER"], kind="mergesort")
    primary = primary.drop_duplicates("ACCESSIONNUMBER", keep="last")
    report.add_step(
        "Drop extra primary-issuer rows for the same filing",
        before_primary_dedupe,
        len(primary),
        "issuer rows",
    )

    submissions = without_load_meta(submissions)
    primary = without_load_meta(primary)
    offerings = without_load_meta(offerings)
    submission_count = len(submissions)
    merged = submissions.merge(primary, on="ACCESSIONNUMBER", how="inner", suffixes=("", "_issuer"))
    report.add_step(
        "Join submissions to primary issuers",
        submission_count,
        len(merged),
        "filings",
    )
    before_offering = len(merged)
    merged = merged.merge(offerings, on="ACCESSIONNUMBER", how="inner", suffixes=("", "_offering"))
    report.add_step(
        "Join filings to offerings",
        before_offering,
        len(merged),
        "filings",
    )
    merged = merged.rename(
        columns={
            "ACCESSIONNUMBER": "accession_number",
            "FILING_DATE": "filing_date_raw",
            "SUBMISSIONTYPE": "submission_type",
            "CIK": "cik",
            "ENTITYNAME": "entity_name",
            "STATEORCOUNTRY": "state_raw",
            "JURISDICTIONOFINC": "jurisdiction_of_inc",
            "ENTITYTYPE": "entity_type",
            "YEAROFINC_TIMESPAN_CHOICE": "year_of_inc_timespan",
            "YEAROFINC_VALUE_ENTERED": "year_of_inc",
            "INDUSTRYGROUPTYPE": "industry",
            "INVESTMENTFUNDTYPE": "investment_fund_type",
            "ISPOOLEDINVESTMENTFUNDTYPE": "is_pooled_raw",
            "REVENUERANGE": "revenue_range",
            "ISAMENDMENT": "is_amendment_raw",
            "PREVIOUSACCESSIONNUMBER": "previous_accession",
            "SALE_DATE": "sale_date_raw",
            "YETTOOCCUR": "yet_to_occur_raw",
            "ISEQUITYTYPE": "is_equity_raw",
            "ISDEBTTYPE": "is_debt_raw",
            "TOTALOFFERINGAMOUNT": "offering_amount_raw",
            "TOTALAMOUNTSOLD": "amount_sold_raw",
            "TOTALNUMBERALREADYINVESTED": "investors_raw",
        }
    )
    merged["cik"] = normalize_cik(merged["cik"])
    merged["state"] = normalize_state(merged["state_raw"])
    merged["submission_type"] = merged["submission_type"].fillna("").astype(str).str.strip().str.upper()
    merged["previous_accession"] = (
        merged["previous_accession"].fillna("").astype(str).str.strip().replace({"": pd.NA})
    )
    merged.loc[merged["previous_accession"].isin(_BLANK_TOKENS), "previous_accession"] = pd.NA
    for column in (
        "entity_name",
        "industry",
        "revenue_range",
        "investment_fund_type",
        "year_of_inc",
        "year_of_inc_timespan",
        "entity_type",
    ):
        merged[column] = merged[column].fillna("").astype(str).str.strip().replace({"": pd.NA})
    return merged


def apply_cleaning_rules(
    filings: pd.DataFrame, report: QualityReport
) -> tuple[pd.DataFrame, dict[str, int], dict[str, int]]:
    pooled_industry = filings["industry"].fillna("").str.strip().str.casefold().eq("pooled investment fund")
    pooled_flag = parse_bool(filings["is_pooled_raw"])
    fund_type_filled = filings["investment_fund_type"].notna()
    is_fund = pooled_industry | pooled_flag
    report.note(
        "Fund flags: "
        f"{int(pooled_industry.sum()):,} industry = Pooled Investment Fund, "
        f"{int(pooled_flag.sum()):,} ISPOOLEDINVESTMENTFUNDTYPE true, "
        f"{int((pooled_industry & pooled_flag).sum()):,} both, "
        f"{int((fund_type_filled & ~is_fund).sum()):,} have INVESTMENTFUNDTYPE set but were kept "
        "(the drop rule does not use that column)."
    )
    population = {
        "all_filings": len(filings),
        "all_companies": int(filings["cik"].nunique()),
    }
    before = len(filings)
    filings = filings.loc[~is_fund].copy()
    population["operating_filings"] = len(filings)
    population["operating_companies"] = int(filings["cik"].nunique())
    report.add_step("Drop investment funds", before, len(filings), "filings")

    before = len(filings)
    us_mask = filings["state"].isin(US_STATE_CODES)
    dropped_states = (
        filings.loc[~us_mask, "state"].fillna("(blank)").astype(str).value_counts().head(15)
    )
    filings = filings.loc[us_mask].copy()
    population["us_filings"] = len(filings)
    population["us_companies"] = int(filings["cik"].nunique())
    report.add_step("Keep US issuers (state or DC)", before, len(filings), "filings")
    if not dropped_states.empty:
        preview = ", ".join(f"{code} {count:,}" for code, count in dropped_states.items())
        report.note(f"Most common non-US STATEORCOUNTRY values removed: {preview}")

    before = len(filings)
    filings = filings.loc[filings["cik"].notna()].copy()
    report.add_step("Drop filings with no CIK", before, len(filings), "filings")

    filings["sale_date"] = parse_dates(filings["sale_date_raw"])
    filings["filing_date"] = parse_dates(filings["filing_date_raw"])
    yet_to_occur = parse_bool(filings["yet_to_occur_raw"])
    today = pd.Timestamp.today().normalize()
    sale_usable = filings["sale_date"].notna() & (filings["sale_date"] <= today) & ~yet_to_occur
    filings["event_date"] = filings["sale_date"].where(sale_usable, filings["filing_date"])
    filings["event_date_source"] = pd.Series(pd.NA, index=filings.index, dtype="object")
    filings.loc[sale_usable, "event_date_source"] = "SALE_DATE"
    filing_used = ~sale_usable & filings["filing_date"].notna()
    filings.loc[filing_used, "event_date_source"] = "FILING_DATE"

    before = len(filings)
    dated = filings.loc[filings["event_date"].notna()].copy()
    report.add_step("Drop filings with no usable event date", before, len(dated), "filings")
    source_counts = dated["event_date_source"].value_counts(dropna=False)
    sale_n = int(source_counts.get("SALE_DATE", 0))
    filing_n = int(source_counts.get("FILING_DATE", 0))
    dated_n = len(dated)
    sale_share = (sale_n / dated_n * 100.0) if dated_n else 0.0
    filing_share = (filing_n / dated_n * 100.0) if dated_n else 0.0
    report.note(
        f"Event date source among kept filings: SALE_DATE {sale_n:,} ({sale_share:.1f}%), "
        f"FILING_DATE {filing_n:,} ({filing_share:.1f}%). "
        f"SALE_DATE was skipped when it was missing, after {today.date()}, or YETTOOCCUR was true "
        f"({int(yet_to_occur.sum()):,} filings had YETTOOCCUR true before this filter)."
    )
    date_stats = {
        "sale_date": sale_n,
        "filing_date": filing_n,
        "kept": dated_n,
        "yet_to_occur": int(yet_to_occur.sum()),
    }

    before = len(dated)
    amount_sold, sold_indef, sold_bad, sold_neg = parse_number(dated["amount_sold_raw"])
    offering_amount, offer_indef, offer_bad, offer_neg = parse_number(dated["offering_amount_raw"])
    investors, inv_indef, inv_bad, inv_neg = parse_number(dated["investors_raw"])
    dated["amount_sold"] = amount_sold
    dated["offering_amount"] = offering_amount
    dated["investor_count"] = investors.round().astype("Int64")
    report.add_step("Parse offering amounts and investor counts", before, len(dated), "filings")
    report.note(
        "TOTALAMOUNTSOLD: "
        f"{sold_indef:,} Indefinite, {sold_bad:,} unparseable, {sold_neg:,} negative "
        f"({int(dated['amount_sold'].notna().sum()):,} numeric). "
        "TOTALOFFERINGAMOUNT: "
        f"{offer_indef:,} Indefinite, {offer_bad:,} unparseable, {offer_neg:,} negative "
        f"({int(dated['offering_amount'].notna().sum()):,} numeric). "
        "TOTALNUMBERALREADYINVESTED: "
        f"{inv_indef:,} Indefinite, {inv_bad:,} unparseable, {inv_neg:,} negative."
    )
    dated["is_amendment"] = parse_bool(dated["is_amendment_raw"]) | dated["submission_type"].eq("D/A")
    unexpected = sorted(set(dated["submission_type"].unique()) - {"D", "D/A", ""})
    if unexpected:
        report.note(f"Unexpected SUBMISSIONTYPE values kept: {', '.join(unexpected)}")
    return dated, date_stats, population


def _clean_accession(value: object) -> str | None:
    if value is None or value is pd.NA:
        return None
    if isinstance(value, float) and pd.isna(value):
        return None
    text = str(value).strip()
    if text.lower() in _BLANK_TOKENS:
        return None
    return text


def link_offerings(filings: pd.DataFrame, report: QualityReport) -> pd.DataFrame:
    """Point every filing at the original new notice for its offering."""
    accessions = filings["accession_number"].astype(str).tolist()
    is_amendment = filings["is_amendment"].tolist()
    previous = [_clean_accession(value) for value in filings["previous_accession"].tolist()]
    ciks = filings["cik"].tolist()
    event_dates = filings["event_date"].tolist()
    filing_dates = filings["filing_date"].tolist()

    amend_by_acc = dict(zip(accessions, is_amendment))
    prev_by_acc = dict(zip(accessions, previous))

    new_by_cik: dict[str, list[tuple[pd.Timestamp, pd.Timestamp, str]]] = defaultdict(list)
    for accession, amendment, cik, event_date, filing_date in zip(
        accessions, is_amendment, ciks, event_dates, filing_dates
    ):
        if not amendment:
            filing_key = filing_date if pd.notna(filing_date) else pd.Timestamp.min
            new_by_cik[cik].append((event_date, filing_key, accession))
    for cik in new_by_cik:
        new_by_cik[cik].sort()

    resolved: dict[str, str | None] = {}

    def resolve_chain(accession: str, stack: set[str]) -> str | None:
        if accession in resolved:
            return resolved[accession]
        if accession in stack or accession not in amend_by_acc:
            resolved[accession] = None
            return None
        if not amend_by_acc[accession]:
            resolved[accession] = accession
            return accession
        parent = prev_by_acc.get(accession)
        if parent is None or parent == accession:
            resolved[accession] = None
            return None
        if parent not in amend_by_acc:
            resolved[accession] = None
            return None
        stack.add(accession)
        root = resolve_chain(parent, stack)
        stack.remove(accession)
        resolved[accession] = root
        return root

    offering_ids: list[str] = []
    methods: list[str] = []
    for accession, amendment, cik, event_date, filing_date in zip(
        accessions, is_amendment, ciks, event_dates, filing_dates
    ):
        if not amendment:
            offering_ids.append(accession)
            methods.append("new_notice")
            continue
        root = resolve_chain(accession, set())
        if root is not None:
            offering_ids.append(root)
            methods.append("accession_chain")
            continue
        candidates = new_by_cik.get(cik, [])
        filing_key = filing_date if pd.notna(filing_date) else pd.Timestamp.max
        # Most recent new notice on or before this amendment's event date.
        index = bisect_right(candidates, (event_date, filing_key, "\uffff"))
        fallback = None
        if index:
            candidate_event, _candidate_filing, candidate_acc = candidates[index - 1]
            if candidate_event <= event_date and candidate_acc != accession:
                fallback = candidate_acc
        if fallback is not None:
            offering_ids.append(fallback)
            methods.append("cik_fallback")
        else:
            offering_ids.append(accession)
            methods.append("unlinked")

    filings = filings.copy()
    filings["offering_id"] = offering_ids
    filings["link_method"] = methods
    method_counts = filings["link_method"].value_counts()
    report.note(
        "Amendment linking: "
        f"{int(method_counts.get('new_notice', 0)):,} new notices, "
        f"{int(method_counts.get('accession_chain', 0)):,} amendments linked by PREVIOUSACCESSIONNUMBER, "
        f"{int(method_counts.get('cik_fallback', 0)):,} amendments attached to the most recent earlier "
        f"new notice from the same CIK, "
        f"{int(method_counts.get('unlinked', 0)):,} amendments kept as their own offering "
        "(no earlier new notice)."
    )
    return filings


def collapse_amendments(filings: pd.DataFrame, report: QualityReport) -> pd.DataFrame:
    filings = link_offerings(filings, report)
    before = len(filings)
    filings = filings.sort_values(
        ["offering_id", "filing_date", "event_date", "accession_number"],
        kind="mergesort",
        na_position="first",
    )
    amount_frame = filings[["offering_id", "amount_sold", "offering_amount", "investor_count"]].copy()
    amount_frame["investor_count"] = pd.to_numeric(amount_frame["investor_count"], errors="coerce")
    for column in ("amount_sold", "offering_amount", "investor_count"):
        amount_frame[column] = amount_frame.groupby("offering_id", sort=False)[column].ffill()
    latest_amounts = amount_frame.groupby("offering_id", sort=False).tail(1)

    description = filings[
        ["offering_id", "entity_name", "state", "industry", "revenue_range"]
    ].copy()
    for column in ("entity_name", "state", "industry", "revenue_range"):
        description[column] = description.groupby("offering_id", sort=False)[column].ffill()
    latest_description = description.groupby("offering_id", sort=False).tail(1)

    origin_columns = [
        "offering_id",
        "cik",
        "event_date",
        "event_date_source",
        "year_of_inc",
        "year_of_inc_timespan",
        "entity_type",
        "industry",
    ]
    originals = filings.loc[
        filings["accession_number"].eq(filings["offering_id"]),
        origin_columns,
    ].rename(columns={"industry": "industry_at_start"})
    missing_ids = set(filings["offering_id"]) - set(originals["offering_id"])
    if missing_ids:
        report.note(
            f"{len(missing_ids):,} offerings had no original new-notice row after linking; "
            "their earliest remaining filing supplies the event date."
        )
        stand_in = (
            filings.loc[filings["offering_id"].isin(missing_ids)]
            .groupby("offering_id", sort=False)
            .head(1)[origin_columns]
            .rename(columns={"industry": "industry_at_start"})
        )
        originals = pd.concat([originals, stand_in], ignore_index=True)

    offerings = originals.merge(
        latest_description, on="offering_id", how="left"
    ).merge(latest_amounts, on="offering_id", how="left")
    offerings = offerings.drop_duplicates("offering_id", keep="first")
    report.add_step("Collapse amendments into offerings", before, len(offerings), "filings to offerings")
    return offerings.reset_index(drop=True)


def assign_round_numbers(offerings: pd.DataFrame) -> pd.DataFrame:
    """Merge offerings within ROUND_MERGE_WINDOW_DAYS of the round's first date."""
    ordered = offerings.sort_values(["cik", "event_date", "offering_id"], kind="mergesort")
    round_numbers: list[int] = []
    previous_cik = None
    round_start = None
    current = 0
    for cik, event_date in zip(ordered["cik"].tolist(), ordered["event_date"].tolist()):
        if cik != previous_cik:
            current = 1
            round_start = event_date
            previous_cik = cik
        elif (pd.Timestamp(event_date) - pd.Timestamp(round_start)).days > ROUND_MERGE_WINDOW_DAYS:
            current += 1
            round_start = event_date
        round_numbers.append(current)
    ordered = ordered.copy()
    ordered["observed_round_number"] = round_numbers
    return ordered


def assemble_rounds(offerings: pd.DataFrame) -> pd.DataFrame:
    """Merge offerings into rounds. Does not set is_startup or company_industry."""
    labeled = assign_round_numbers(offerings)
    labeled = labeled.sort_values(
        ["cik", "observed_round_number", "event_date", "offering_id"], kind="mergesort"
    )
    round_key = ["cik", "observed_round_number"]

    sums = labeled.groupby(round_key, as_index=False).agg(
        amount_sold=("amount_sold", lambda series: series.sum(min_count=1)),
        investor_count=("investor_count", "max"),
        n_offerings=("offering_id", "size"),
    )
    # Year of incorporation and the industry at the start of the round come from
    # the original notice, earliest offering first. A later blank does not erase
    # an earlier value in the same round.
    at_start = labeled[
        round_key + ["year_of_inc", "year_of_inc_timespan", "industry_at_start", "entity_type"]
    ].copy()
    for column in ("year_of_inc", "year_of_inc_timespan", "industry_at_start", "entity_type"):
        at_start[column] = at_start.groupby(round_key, sort=False)[column].bfill()
    at_start = at_start.groupby(round_key, as_index=False).head(1)
    earliest = labeled.groupby(round_key, as_index=False).head(1)[
        round_key + ["event_date", "event_date_source"]
    ].merge(at_start, on=round_key, how="left")
    latest = labeled.groupby(round_key, as_index=False).tail(1)[
        round_key + ["entity_name", "state", "industry", "revenue_range"]
    ]
    rounds = earliest.merge(latest, on=round_key, how="inner").merge(sums, on=round_key, how="inner")
    rounds = rounds.sort_values(round_key, kind="mergesort").reset_index(drop=True)
    grouped = rounds.groupby("cik", sort=False)
    previous_date = grouped["event_date"].shift(1)
    next_date = grouped["event_date"].shift(-1)
    rounds["months_since_previous_round"] = (
        (rounds["event_date"] - previous_date).dt.days / DAYS_PER_MONTH
    ).round(2)
    rounds["months_to_next_round"] = (
        (next_date - rounds["event_date"]).dt.days / DAYS_PER_MONTH
    ).round(2)
    rounds["is_censored"] = next_date.isna()
    rounds["amount_bucket"] = assign_amount_bucket(rounds["amount_sold"])
    rounds["observed_round_number"] = rounds["observed_round_number"].astype(int)
    rounds["investor_count"] = rounds["investor_count"].astype("Int64")
    return rounds


def build_rounds(
    offerings: pd.DataFrame, report: QualityReport
) -> tuple[pd.DataFrame, dict[str, int], pd.DataFrame]:
    before = len(offerings)
    rounds = assemble_rounds(offerings)
    rounds, startup_stats, company_attrs = mark_startups(rounds, report)
    report.add_step(
        f"Merge offerings within {ROUND_MERGE_WINDOW_DAYS} days into rounds",
        before,
        len(rounds),
        "offerings to rounds",
    )
    merged_rounds = int((rounds["n_offerings"] > 1).sum())
    report.note(
        f"{merged_rounds:,} rounds combine more than one offering "
        f"(event dates within {ROUND_MERGE_WINDOW_DAYS} days of that round's first offering)."
    )
    return rounds[FINAL_COLUMNS], startup_stats, company_attrs


def _timespan_is_within_five_years(series: pd.Series) -> pd.Series:
    """Form D's 'Within Last Five Years' is stored as withinFiveYears."""
    text = series.fillna("").astype(str).str.strip().str.casefold()
    text = text.str.replace(r"[\s_\-]+", "", regex=True)
    return text.isin({"withinfiveyears", "withinlastfiveyears", "withinthefiveyears"})


def _year_within_five_of_event(year_text: pd.Series, event_date: pd.Series) -> pd.Series:
    entered = pd.to_numeric(year_text.fillna("").astype(str).str.extract(r"(\d{4})", expand=False), errors="coerce")
    delta = event_date.dt.year - entered
    return entered.notna() & delta.abs().le(YOUNG_COMPANY_YEARS)


def mark_startups(
    rounds: pd.DataFrame, report: QualityReport
) -> tuple[pd.DataFrame, dict[str, int], pd.DataFrame]:
    """Flag companies from the first observed round. Every later round inherits the flag.

    A startup's first observed round is on or after 2010-01-01, and that round
    reports incorporation within the last five years or a year within five years
    of the event date. Non-startups stay in the frame.
    """
    first = rounds.loc[rounds["observed_round_number"].eq(1)].copy()
    young_choice = _timespan_is_within_five_years(first["year_of_inc_timespan"])
    young_year = _year_within_five_of_event(first["year_of_inc"], first["event_date"])
    young = young_choice | young_year
    recent = first["event_date"].ge(STARTUP_FIRST_ROUND_ON_OR_AFTER)
    first["is_startup"] = young & recent
    first["startup_reason"] = "startup"
    first.loc[~recent & young, "startup_reason"] = "before_2010"
    first.loc[recent & ~young, "startup_reason"] = "not_young"
    first.loc[~recent & ~young, "startup_reason"] = "both"

    company_fields = first[["cik", "is_startup", "startup_reason", "industry_at_start"]].rename(
        columns={"industry_at_start": "company_industry"}
    )
    company_attrs = first[["cik", "is_startup", "industry_at_start", "entity_type"]].rename(
        columns={"industry_at_start": "company_industry"}
    )
    rounds = rounds.drop(
        columns=["year_of_inc", "year_of_inc_timespan", "industry_at_start", "entity_type"]
    ).merge(company_fields, on="cik", how="left")
    rounds["is_startup"] = rounds["is_startup"].fillna(False).astype(bool)
    missing_reason = rounds["startup_reason"].isna()
    rounds.loc[missing_reason, "startup_reason"] = "not_young"
    rounds.loc[missing_reason, "is_startup"] = False

    stats: dict[str, int] = {}
    for reason in ("startup", "before_2010", "not_young", "both"):
        mask = rounds["startup_reason"].eq(reason)
        stats[f"{reason}_companies"] = int(rounds.loc[mask, "cik"].nunique())
        stats[f"{reason}_rounds"] = int(mask.sum())
    stats["choice_only_companies"] = int(
        first.loc[young_choice & ~young_year & recent, "cik"].nunique()
    )
    stats["year_only_companies"] = int(
        first.loc[young_year & ~young_choice & recent, "cik"].nunique()
    )
    stats["both_signals_companies"] = int(
        first.loc[young_choice & young_year & recent, "cik"].nunique()
    )
    excluded_companies = stats["before_2010_companies"] + stats["not_young_companies"] + stats["both_companies"]
    excluded_rounds = stats["before_2010_rounds"] + stats["not_young_rounds"] + stats["both_rounds"]
    report.note(
        "Startup flag uses the first observed round only. "
        f"{stats['startup_companies']:,} companies ({stats['startup_rounds']:,} rounds) are startups. "
        f"{excluded_companies:,} companies ({excluded_rounds:,} rounds) stay in rounds.parquet with "
        "is_startup false: "
        f"{stats['before_2010_companies']:,} because the first round is before 2010-01-01, "
        f"{stats['not_young_companies']:,} because that round does not show a company under five years old, "
        f"{stats['both_companies']:,} for both reasons."
    )
    return rounds.drop(columns=["startup_reason"]), stats, company_attrs


def assign_amount_bucket(amount: pd.Series) -> pd.Series:
    bucket = pd.Series("unknown", index=amount.index, dtype="object")
    known = amount.notna()
    bucket = bucket.mask(known & (amount < 1_000_000), "<$1M")
    bucket = bucket.mask(known & (amount >= 1_000_000) & (amount < 5_000_000), "$1–5M")
    bucket = bucket.mask(known & (amount >= 5_000_000) & (amount < 20_000_000), "$5–20M")
    bucket = bucket.mask(known & (amount >= 20_000_000), "$20M+")
    return bucket


def rounds_per_company_table(rounds: pd.DataFrame) -> str:
    counts = rounds.groupby("cik").size()
    distribution = counts.value_counts().sort_index()
    lines = [
        "| Rounds per company | Companies | Share of companies |",
        "|---:|---:|---:|",
    ]
    total = int(counts.shape[0])
    for n_rounds, n_companies in distribution.items():
        share = (n_companies / total * 100.0) if total else 0.0
        lines.append(f"| {int(n_rounds)} | {int(n_companies):,} | {share:.1f}% |")
    return "\n".join(lines)


def _industry_status(industry: object) -> str:
    """Sector name, EXCLUDE, or UNMAPPED. Missing dict keys are not assigned a sector."""
    if industry is None or industry is pd.NA:
        return "UNMAPPED"
    try:
        if pd.isna(industry):
            return "UNMAPPED"
    except (TypeError, ValueError):
        pass
    key = str(industry)
    if key not in VENTURE_SECTOR_BY_INDUSTRY:
        return "UNMAPPED"
    mapped = VENTURE_SECTOR_BY_INDUSTRY[key]
    return "EXCLUDE" if mapped is None else mapped


def _entity_status(entity: object) -> str:
    if entity is None or entity is pd.NA:
        return "NOT KEPT"
    try:
        if pd.isna(entity):
            return "NOT KEPT"
    except (TypeError, ValueError):
        pass
    key = str(entity).strip()
    if key in VENTURE_ENTITY_TYPES:
        return "KEEP"
    if key in EXCLUDED_ENTITY_TYPES:
        return "EXCLUDE"
    return "NOT KEPT"


def startup_industry_behavior(startup_rounds: pd.DataFrame) -> str:
    """Follow-on rate and deal size for every startup industry.

    Later rounds per company are uncensored rounds divided by companies.
    A round is uncensored when a later round for that company was observed.
    """
    rows: list[tuple[int, str, float, float]] = []
    for industry, group in startup_rounds.groupby("company_industry", dropna=False):
        label = "(missing)" if pd.isna(industry) else str(industry)
        companies = int(group["cik"].nunique())
        later = int((~group["is_censored"]).sum())
        rate = (later / companies) if companies else 0.0
        median = group["amount_sold"].median()
        rows.append((companies, label, rate, float(median) if pd.notna(median) else float("nan")))
    rows.sort(key=lambda item: (-item[0], item[1]))
    lines = [
        "Among startups, one row per INDUSTRYGROUPTYPE (the company's first observed round).",
        "Later rounds per company = uncensored rounds / companies. "
        "An uncensored round is one that was followed by a later observed round.",
        "Median amount sold is the median amount_sold on those rounds. Nulls are omitted. Zeros are kept.",
        "Single-deal vehicles sit near zero later rounds per company. "
        "Operating companies that raise again sit well above that.",
        "",
        f"{'INDUSTRYGROUPTYPE':<42} {'Companies':>10} {'Later rounds per company':>26} {'Median amount sold':>20}",
    ]
    for companies, label, rate, median in rows:
        median_text = "n/a" if median != median else f"${median:,.0f}"
        lines.append(f"{label:<42} {companies:>10,} {rate:>26.3f} {median_text:>20}")
    return "\n".join(lines)


def industry_census(company_attrs: pd.DataFrame, offerings: pd.DataFrame) -> str:
    """Every industry on a company, plus any industry that appears only on a later offering."""
    rows: list[tuple[int, str, str, int]] = []
    for industry, group in company_attrs.groupby("company_industry", dropna=False):
        label = "(missing)" if pd.isna(industry) else str(industry)
        rows.append(
            (
                int(group["cik"].nunique()),
                label,
                _industry_status(industry),
                int(group.loc[group["is_startup"], "cik"].nunique()),
            )
        )
    rows.sort(key=lambda item: (-item[0], item[1]))
    known = {label for _, label, _, _ in rows}
    extra_counts: dict[str, int] = {}
    for column in ("industry", "industry_at_start"):
        if column not in offerings.columns:
            continue
        counts = offerings[column].dropna().astype(str).value_counts()
        for label, count in counts.items():
            if label not in known:
                extra_counts[label] = extra_counts.get(label, 0) + int(count)
    lines = [
        "Every INDUSTRYGROUPTYPE on a company's first observed round.",
        "Companies is the count after funds are dropped and the issuer is in a US state or DC.",
        "Startups is how many of those companies pass the startup rule.",
        "Sector is the VentureLens mapping. EXCLUDE is an industry the mapping rejects.",
        "UNMAPPED means the value is not in the mapping, so it is not treated as venture.",
        "The form's travel group is three file labels (Lodging and Conventions, Other Travel, "
        "Tourism and Travel Services), all mapped to Consumer.",
        "",
        f"{'INDUSTRYGROUPTYPE':<42} {'Sector':<22} {'Companies':>10} {'Startups':>10}",
    ]
    unmapped: list[str] = []
    for companies, label, status, startups in rows:
        lines.append(f"{label:<42} {status:<22} {companies:>10,} {startups:>10,}")
        if status == "UNMAPPED":
            unmapped.append(label)
    if extra_counts:
        lines.append("")
        lines.append("Present on an offering but never a company's first industry:")
        for label in sorted(extra_counts):
            status = _industry_status(label)
            lines.append(f"  {label}: {status}, {extra_counts[label]:,} offering rows")
            if status == "UNMAPPED":
                unmapped.append(label)
    lines.append("")
    if unmapped:
        lines.append("UNMAPPED values (not assigned a sector): " + ", ".join(unmapped))
    else:
        lines.append("UNMAPPED values: none. Every industry above is in the mapping.")
    return "\n".join(lines)


def entity_distribution(company_attrs: pd.DataFrame) -> str:
    frame = company_attrs.copy()
    frame["entity_label"] = frame["entity_type"].map(lambda value: "(missing)" if pd.isna(value) else str(value))
    rows: list[tuple[int, str, str, int]] = []
    for entity, group in frame.groupby("entity_label", dropna=False):
        status = _entity_status(None if entity == "(missing)" else entity)
        rows.append(
            (
                int(group["cik"].nunique()),
                str(entity),
                status,
                int(group.loc[group["is_startup"], "cik"].nunique()),
            )
        )
    rows.sort(key=lambda item: (-item[0], item[1]))
    lines = [
        "ENTITYTYPE on the company's first observed round (original notice, filled forward within that round).",
        "KEEP is Corporation or Limited Liability Company.",
        "EXCLUDE is Limited Partnership, General Partnership, or Business Trust.",
        "NOT KEPT is any other value, including Other and blank. Those companies are not in the venture set.",
        "",
        f"{'ENTITYTYPE':<42} {'Rule':<12} {'Companies':>10} {'Startups':>10}",
    ]
    not_kept: list[str] = []
    for companies, label, status, startups in rows:
        lines.append(f"{label:<42} {status:<12} {companies:>10,} {startups:>10,}")
        if status == "NOT KEPT":
            not_kept.append(label)
    lines.append("")
    if not_kept:
        lines.append("Not kept (not named as a corporation, LLC, or deal vehicle): " + ", ".join(not_kept))
    else:
        lines.append("Not kept: none.")
    return "\n".join(lines)


def build_venture_rounds(
    offerings: pd.DataFrame, company_attrs: pd.DataFrame, report: QualityReport
) -> tuple[pd.DataFrame, dict[str, int]]:
    """Rebuild rounds for venture-relevant startups, using completed offerings only.

    rounds.parquet and startup_rounds.parquet are left unchanged. A completed
    offering has a final TOTALAMOUNTSOLD greater than zero. Zero and null are
    not completed rounds, so they do not enter this 90-day merge.
    """
    attrs = company_attrs.copy()
    attrs["sector_status"] = [_industry_status(value) for value in attrs["company_industry"].tolist()]
    attrs["entity_status"] = [_entity_status(value) for value in attrs["entity_type"].tolist()]
    startups = attrs.loc[attrs["is_startup"]]
    venture_companies = startups.loc[
        startups["sector_status"].isin(_VENTURE_SECTOR_NAMES) & startups["entity_status"].eq("KEEP"),
        ["cik", "company_industry", "sector_status"],
    ].rename(columns={"sector_status": "venture_sector"})
    venture_ciks = set(venture_companies["cik"])
    relevant = offerings.loc[offerings["cik"].isin(venture_ciks)]
    completed_mask = relevant["amount_sold"].notna() & relevant["amount_sold"].gt(0)
    completed = relevant.loc[completed_mask]
    incomplete = int((~completed_mask).sum())
    report.note(
        f"{incomplete:,} offerings from venture-relevant startups have a final TOTALAMOUNTSOLD "
        "of 0 or null and are excluded from venture round construction. "
        f"{len(completed):,} completed offerings are merged into venture rounds."
    )
    excluded = pd.DataFrame(columns=LIKELY_NON_STARTUP_COLUMNS)
    excluded_rounds = 0
    if completed.empty:
        venture = pd.DataFrame(columns=VENTURE_COLUMNS)
    else:
        built = assemble_rounds(completed)
        helper_columns = ["year_of_inc", "year_of_inc_timespan", "industry_at_start", "entity_type"]
        built = built.drop(columns=[column for column in helper_columns if column in built.columns])
        venture = built.merge(venture_companies, on="cik", how="inner")
        reviewed = load_excluded_companies()
        unknown = sorted(set(reviewed["cik"]) - set(venture["cik"]))
        if unknown:
            raise SystemExit(
                f"ERROR: excluded_companies.csv lists CIKs that are not in the venture set: {', '.join(unknown)}"
            )
        excluded = likely_non_startups(venture, reviewed)
        report.note(
            f"{excluded['cik'].nunique():,} companies ({int(excluded['rounds'].sum()):,} completed rounds) "
            "look like non-startups and are dropped from venture rounds: "
            + ", ".join(
                f"{rule} {count:,}" for rule, count in excluded["rule"].value_counts().sort_index().items()
            )
            + ". They stay in rounds.parquet and are listed in likely_non_startups.csv."
        )
        excluded_rounds = int(excluded["rounds"].sum())
        excluded_ciks = set(excluded["cik"])
        venture = venture.loc[~venture["cik"].isin(excluded_ciks)].copy()
        venture["is_startup"] = True
        venture["is_venture"] = True
        venture = (
            venture[VENTURE_COLUMNS]
            .sort_values(["cik", "observed_round_number"], kind="mergesort")
            .reset_index(drop=True)
        )
    likely_companies = int(venture["cik"].nunique()) if len(venture) else 0
    stats = {
        "venture_companies": int(venture_companies["cik"].nunique()),
        "completed_companies": likely_companies + int(excluded["cik"].nunique()),
        "completed_rounds": int(len(venture)) + excluded_rounds,
        "likely_startup_companies": likely_companies,
        "venture_rounds": int(len(venture)),
        "incomplete_offerings": incomplete,
        "completed_offerings": int(len(completed)),
        "relevant_offerings": int(len(relevant)),
    }
    return venture, stats, excluded


LIKELY_NON_STARTUP_COLUMNS = ["cik", "entity_name", "rule", "detail", "rounds"]


def load_excluded_companies(path: Path = EXCLUDED_COMPANIES_PATH) -> pd.DataFrame:
    """The hand-reviewed list: cik, entity_name, reason."""
    frame = pd.read_csv(path, dtype=str)
    missing = {"cik", "entity_name", "reason"} - set(frame.columns)
    if missing:
        raise SystemExit(f"ERROR: {path} is missing columns: {', '.join(sorted(missing))}")
    if frame["cik"].duplicated().any():
        raise SystemExit(f"ERROR: {path} lists a CIK more than once.")
    return frame


def likely_non_startups(rounds: pd.DataFrame, reviewed: pd.DataFrame) -> pd.DataFrame:
    """Companies in the venture set that are probably not startups, one row each.

    Checked in this order, and the first rule that applies is recorded:
    1. reviewed: the CIK is in excluded_companies.csv.
    2. vehicle_name: any round's entity name matches VEHICLE_NAME_PATTERN.
    3. established_revenue: the first observed round reports revenue over $100M.
    """
    ordered = rounds.sort_values(["cik", "observed_round_number"], kind="mergesort")
    per_company = ordered.groupby("cik", sort=True).agg(
        entity_name=("entity_name", "last"),
        first_revenue=("revenue_range", "first"),
        rounds=("cik", "size"),
    )
    vehicle_names = (
        ordered.loc[ordered["entity_name"].fillna("").str.contains(VEHICLE_NAME_PATTERN), ["cik", "entity_name"]]
        .drop_duplicates("cik")
        .set_index("cik")["entity_name"]
    )
    reasons = reviewed.set_index("cik")["reason"]
    records = []
    for cik, row in per_company.iterrows():
        if cik in reasons.index:
            rule, detail = "reviewed", reasons[cik]
        elif cik in vehicle_names.index:
            rule, detail = "vehicle_name", f"Name looks like a buyout, SPAC or fund vehicle: {vehicle_names[cik]}"
        elif row["first_revenue"] == ESTABLISHED_REVENUE_RANGE:
            rule, detail = "established_revenue", "Reported revenue over $100M at its first observed round"
        else:
            continue
        records.append(
            {
                "cik": cik,
                "entity_name": row["entity_name"],
                "rule": rule,
                "detail": detail,
                "rounds": int(row["rounds"]),
            }
        )
    return pd.DataFrame(records, columns=LIKELY_NON_STARTUP_COLUMNS)


def funnel_steps(
    population: dict[str, int], startup_stats: dict[str, int], venture_stats: dict[str, int]
) -> list[dict[str, object]]:
    """The funnel as {step, companies, rows, row_unit} records, in order."""
    steps = [
        ("All filings", population["all_companies"], population["all_filings"], "filings"),
        (
            "Operating companies",
            population["operating_companies"],
            population["operating_filings"],
            "filings",
        ),
        ("US", population["us_companies"], population["us_filings"], "filings"),
        (
            "Startups",
            startup_stats["startup_companies"],
            startup_stats["startup_rounds"],
            "startup rounds",
        ),
        (
            "Venture-relevant",
            venture_stats["venture_companies"],
            venture_stats["relevant_offerings"],
            "offerings",
        ),
        (
            "Completed rounds",
            venture_stats["completed_companies"],
            venture_stats["completed_rounds"],
            "rounds",
        ),
        (
            "Likely startups",
            venture_stats["likely_startup_companies"],
            venture_stats["venture_rounds"],
            "venture rounds",
        ),
    ]
    return [
        {"step": name, "companies": int(companies), "rows": int(rows), "row_unit": unit}
        for name, companies, rows, unit in steps
    ]


def format_funnel(steps: list[dict[str, object]], venture_stats: dict[str, int]) -> str:
    lines = [
        "Funnel. Percent is companies remaining versus the previous step.",
        "All filings are joined Form D filings, including funds and non-US issuers.",
        "Operating companies are filings after pooled investment funds are dropped.",
        "US is a state or the District of Columbia.",
        "Startups use the first-observed-round rule (2010 and a young company).",
        "Venture-relevant startups have a mapped sector and are a Corporation or Limited Liability Company.",
        "Completed rounds drop offerings whose final TOTALAMOUNTSOLD is 0 or null, then rebuild the 90-day rounds.",
        "Likely startups drop buyout, SPAC and fund vehicles, companies with revenue over $100M at their "
        "first round, and the hand-reviewed list in excluded_companies.csv.",
        f"Offerings left out of that rebuild because the amount sold was 0 or null: "
        f"{venture_stats['incomplete_offerings']:,}.",
        "",
        f"{'Step':<22} {'Companies':>12} {'% of previous':>14} {'Rows':>12}  {'Row unit'}",
    ]
    previous: int | None = None
    for step in steps:
        name, companies, rows, unit = step["step"], step["companies"], step["rows"], step["row_unit"]
        if previous is None or previous == 0:
            share = "100%" if previous is None else "n/a"
        else:
            share = f"{companies / previous * 100.0:.1f}%"
        lines.append(f"{name:<22} {companies:>12,} {share:>14} {rows:>12,}  {unit}")
        previous = companies
    return "\n".join(lines)


def sector_preview(rounds: pd.DataFrame) -> str:
    def table(column: str) -> list[str]:
        rows = []
        for label, group in rounds.groupby(column, dropna=False):
            name = "(missing)" if pd.isna(label) else str(label)
            companies = int(group["cik"].nunique())
            uncensored = group.loc[~group["is_censored"], "months_to_next_round"]
            median = uncensored.median() if not uncensored.empty else pd.NA
            rows.append((companies, name, median, int(uncensored.shape[0])))
        rows.sort(key=lambda item: (-item[0], item[1]))
        body = [
            f"{'Group':<42} {'Companies':>10} {'Median months to next (uncensored)':>36} {'Uncensored rounds':>18}",
        ]
        for companies, name, median, n_uncensored in rows:
            median_text = "n/a" if pd.isna(median) else f"{median:.1f}"
            body.append(f"{name:<42} {companies:>10,} {median_text:>36} {n_uncensored:>18,}")
        return body

    lines = [
        "Rough preview, venture-relevant startups only.",
        "Median months_to_next_round uses uncensored venture rounds only "
        "(a later completed round was observed). This is not a survival estimate.",
        "observed_round_number here counts completed venture rounds, not the numbering in startup_rounds.parquet.",
        "",
        "By VentureLens sector:",
        *table("venture_sector"),
        "",
        "By Form D industry (the company's first observed round):",
        *table("company_industry"),
    ]
    return "\n".join(lines)


def industry_preview(rounds: pd.DataFrame) -> str:
    rows = []
    for industry, group in rounds.groupby("company_industry", dropna=False):
        label = "(missing)" if pd.isna(industry) else str(industry)
        companies = int(group["cik"].nunique())
        uncensored = group.loc[~group["is_censored"], "months_to_next_round"]
        median = uncensored.median() if not uncensored.empty else pd.NA
        rows.append((companies, label, median, int(uncensored.shape[0])))
    rows.sort(key=lambda item: (-item[0], item[1]))
    lines = [
        "Rough preview, startup companies only: 10 largest industries by number of companies.",
        "Each company is counted once, under the industry on its first observed round.",
        "Median months_to_next_round uses uncensored rounds only "
        "(rounds that were followed by a later round). "
        "This is not a survival estimate.",
        "",
        f"{'Industry':<42} {'Companies':>10} {'Median months to next (uncensored)':>36} {'Uncensored rounds':>18}",
    ]
    for companies, label, median, n_uncensored in rows[:10]:
        median_text = "n/a" if pd.isna(median) else f"{median:.1f}"
        lines.append(f"{label:<42} {companies:>10,} {median_text:>36} {n_uncensored:>18,}")
    return "\n".join(lines)


def example_timelines(rounds: pd.DataFrame, limit: int = 5) -> str:
    """Short timelines that still show a 90-day merge, so the rules can be checked by hand.

    The companies with the most rounds are serial filers (oil and gas, insurance).
    A 40-round list does not help a hand check, so the examples are companies with
    3 or 4 rounds, at least one round built from multiple offerings, in a
    technology or health-care industry group.
    """
    use_sector = "venture_sector" in rounds.columns
    summary = rounds.groupby("cik", as_index=False).agg(
        n_rounds=("observed_round_number", "max"),
        entity_name=("entity_name", "last"),
        merged=("n_offerings", "max"),
        industry=("venture_sector" if use_sector else "company_industry", "first"),
    )
    hand_check_industries = (
        {"Technology", "HealthTech/Biotech"}
        if use_sector
        else {
            "Other Technology",
            "Biotechnology",
            "Pharmaceuticals",
            "Other Health Care",
            "Business Services",
            "Telecommunications",
        }
    )
    pool = summary.loc[
        summary["n_rounds"].between(3, 4)
        & summary["merged"].ge(2)
        & summary["industry"].isin(hand_check_industries)
        & summary["entity_name"].notna()
    ].sort_values(["cik"], kind="mergesort")
    chosen = pool.head(limit)
    if chosen.empty:
        pool = summary.loc[summary["n_rounds"] >= 3].sort_values(
            ["n_rounds", "cik"], ascending=[False, True], kind="mergesort"
        )
        chosen = pool.head(limit)
    if chosen.empty:
        return "No company has 3 or more rounds, so there is no timeline to spot-check."
    who = "Venture-relevant startups" if use_sector else "Startup companies only"
    focus = "Technology or HealthTech/Biotech" if use_sector else "technology and health-care industry groups"
    blocks = [
        f"{who}, with 3 or 4 observed rounds, including at least one round "
        f"merged from multiple offerings. Limited to {focus} "
        "and ordered by CIK so the list is stable.",
        "event_date is the original notice's date. amount_sold sums offerings merged into the round.",
    ]
    for record in chosen.itertuples(index=False):
        name = record.entity_name if pd.notna(record.entity_name) else "(no name)"
        blocks.append("")
        blocks.append(f"{name}  CIK {record.cik}  ({int(record.n_rounds)} rounds)")
        company_rounds = rounds.loc[rounds["cik"].eq(record.cik)].sort_values("observed_round_number")
        for row in company_rounds.itertuples(index=False):
            amount = "unknown" if pd.isna(row.amount_sold) else f"${row.amount_sold:,.0f}"
            investors = "unknown" if pd.isna(row.investor_count) else f"{int(row.investor_count):,}"
            since = "—" if pd.isna(row.months_since_previous_round) else f"{row.months_since_previous_round:.2f}"
            until = "—" if pd.isna(row.months_to_next_round) else f"{row.months_to_next_round:.2f}"
            event = pd.Timestamp(row.event_date).date().isoformat()
            blocks.append(
                f"  Observed round {int(row.observed_round_number)}: {event}  sold {amount} ({row.amount_bucket})  "
                f"investors {investors}  offerings_in_round {int(row.n_offerings)}  "
                f"date_source {row.event_date_source}  months_since_prev {since}  "
                f"months_to_next {until}  censored {bool(row.is_censored)}  "
                f"company_industry {row.company_industry}  "
                + (
                    f"venture_sector {row.venture_sector}  "
                    if "venture_sector" in rounds.columns
                    else ""
                )
                + f"state {row.state}  revenue {row.revenue_range}"
            )
    return "\n".join(blocks)


def _startup_section(stats: dict[str, int]) -> str:
    total_companies = (
        stats["startup_companies"]
        + stats["before_2010_companies"]
        + stats["not_young_companies"]
        + stats["both_companies"]
    )
    total_rounds = (
        stats["startup_rounds"]
        + stats["before_2010_rounds"]
        + stats["not_young_rounds"]
        + stats["both_rounds"]
    )
    excluded_companies = total_companies - stats["startup_companies"]
    excluded_rounds = total_rounds - stats["startup_rounds"]

    def share(part: int, whole: int) -> str:
        return f"{(part / whole * 100.0) if whole else 0.0:.1f}%"

    return f"""## Startups and excluded companies

`rounds.parquet` keeps every company. `is_startup` is decided from the first observed round and copied onto every later round of that company. `startup_rounds.parquet` keeps only the startup companies.

A company is a startup when both of these are true for that first round:

1. The event date is on or after 2010-01-01. The files begin in 2008, so a first round in 2008 or 2009 is more likely to be a continuation of a company that already raised before the extract.
2. The issuer reported incorporation within the last five years, or the year they entered is within five calendar years of that event date. In the file, the form's "Within Last Five Years" is the code `withinFiveYears`.

Companies that fail this are mostly older operating companies and repeat filers (public companies, oil and gas programs, insurers), not early-stage startups. They stay in `rounds.parquet` so the exclusion can be checked.

| Group | Companies | Share of companies | Rounds | Share of rounds | Why |
|---|---:|---:|---:|---:|---|
| Startup | {stats["startup_companies"]:,} | {share(stats["startup_companies"], total_companies)} | {stats["startup_rounds"]:,} | {share(stats["startup_rounds"], total_rounds)} | First observed round is on or after 2010-01-01, and the company was under about five years old then |
| Excluded, first round before 2010 | {stats["before_2010_companies"]:,} | {share(stats["before_2010_companies"], total_companies)} | {stats["before_2010_rounds"]:,} | {share(stats["before_2010_rounds"], total_rounds)} | Young at that round, but the round is before 2010-01-01, so an earlier raise is easier to miss |
| Excluded, not a young company | {stats["not_young_companies"]:,} | {share(stats["not_young_companies"], total_companies)} | {stats["not_young_rounds"]:,} | {share(stats["not_young_rounds"], total_rounds)} | First round is on or after 2010-01-01, but neither the five-year choice nor the entered year says the company was young |
| Excluded, both | {stats["both_companies"]:,} | {share(stats["both_companies"], total_companies)} | {stats["both_rounds"]:,} | {share(stats["both_rounds"], total_rounds)} | First round is before 2010-01-01 and the company was not young then |
| Excluded total | {excluded_companies:,} | {share(excluded_companies, total_companies)} | {excluded_rounds:,} | {share(excluded_rounds, total_rounds)} | Not in `startup_rounds.parquet` |

Among startups, the five-year choice and the entered year do not always agree. {stats["both_signals_companies"]:,} companies have both signals, {stats["choice_only_companies"]:,} have only the five-year choice, and {stats["year_only_companies"]:,} have only an entered year within five years of the first round.

`company_industry` is the industry group on the first observed round. Every round for that company uses it. `observed_round_number` counts rounds in this Form D extract, not the company's true lifetime round sequence. The venture file rebuilds that numbering from completed offerings only, so its round numbers can differ.
"""


def render_report(
    report: QualityReport,
    rounds: pd.DataFrame,
    startup_rounds: pd.DataFrame,
    startup_stats: dict[str, int],
    date_stats: dict[str, int],
    census_text: str,
    entity_text: str,
    behavior_text: str,
    funnel_text: str,
    industry_text: str,
    examples_text: str,
) -> str:
    companies = int(rounds["cik"].nunique())
    n_rounds = len(rounds)
    counts = rounds.groupby("cik").size()
    one_round_share = float((counts == 1).mean() * 100.0) if len(counts) else 0.0
    skipped_total = sum(int(item["skipped"]) for item in report.file_stats)
    read_total = sum(int(item["rows"]) for item in report.file_stats)
    sale_share = (date_stats["sale_date"] / date_stats["kept"] * 100.0) if date_stats["kept"] else 0.0
    filing_share = (date_stats["filing_date"] / date_stats["kept"] * 100.0) if date_stats["kept"] else 0.0

    step_lines = [
        "| Step | Unit | Before | After | Removed | % removed |",
        "|---|---|---:|---:|---:|---:|",
    ]
    for step in report.steps:
        step_lines.append(
            f"| {step['name']} | {step['unit']} | {step['before']:,} | {step['after']:,} | "
            f"{step['removed']:,} | {step['percent']:.1f}% |"
        )

    file_lines = [
        "| Quarter | Table | Rows read | Rows skipped | Encoding |",
        "|---|---|---:|---:|---|",
    ]
    for item in report.file_stats:
        file_lines.append(
            f"| {item['quarter']} | {item['table']} | {item['rows']:,} | "
            f"{item['skipped']:,} | {item['encoding']} |"
        )

    note_lines = "\n".join(f"- {note}" for note in report.notes) if report.notes else "- None"
    generated = datetime.now().strftime("%Y-%m-%d %H:%M")
    return f"""# Form D data quality report

Generated {generated}. Source files are the quarterly Form D data sets downloaded by `pipeline/download.py`.

## Loading

Rows are read as strings. A row is skipped when its field count does not match the header. Encoding errors fall through utf-8, then cp1252, then latin-1, so a bad byte does not stop the load.

- Files read: {len(report.file_stats):,}
- Rows read: {read_total:,}
- Rows skipped as malformed: {skipped_total:,}

{chr(10).join(file_lines)}

## Row counts at each step

Percent removed is `(before - after) / before`. The amendment collapse and the 90-day merge change what a row means (filing, then offering, then round), so their "removed" share is the reduction in row count, not deleted companies.

{chr(10).join(step_lines)}

## Notes from each rule

{note_lines}

## Event date source

Among filings kept after the usable-date rule (before amendments are collapsed):

| Source | Filings | Share |
|---|---:|---:|
| SALE_DATE | {date_stats["sale_date"]:,} | {sale_share:.1f}% |
| FILING_DATE | {date_stats["filing_date"]:,} | {filing_share:.1f}% |

SALE_DATE is used when it parses, is not after the run date, and YETTOOCCUR is not true. Otherwise the pipeline uses FILING_DATE. Filings with neither date are dropped.

## Output summary

- Companies (distinct CIK): {companies:,}
- Rounds: {n_rounds:,}
- Companies with only one observed round: {one_round_share:.1f}%
- Median rounds per company: {float(counts.median()) if len(counts) else 0:.0f}
- Max rounds for one company: {int(counts.max()) if len(counts) else 0:,}

`is_censored` is true on a company's latest round, because a later round has not been observed yet. That is not the same as knowing the company failed to raise again.

{_startup_section(startup_stats)}

## Rounds per company

All companies in `rounds.parquet`:

{rounds_per_company_table(rounds)}

Startup companies only:

{rounds_per_company_table(startup_rounds)}

## Industry mapping

```
{census_text}
```

## Entity type

```
{entity_text}
```

## Startup follow-on by industry

```
{behavior_text}
```

## Funnel

```
{funnel_text}
```

## Industry preview (venture set only)

```
{industry_text}
```

## Example timelines (venture set only)

```
{examples_text}
```
"""


def validate_rounds(rounds: pd.DataFrame) -> None:
    missing = [column for column in FINAL_COLUMNS if column not in rounds.columns]
    if missing:
        raise SystemExit(f"ERROR: rounds are missing columns: {', '.join(missing)}")
    if rounds.empty:
        raise SystemExit("ERROR: the pipeline produced no rounds.")
    allowed_buckets = {"<$1M", "$1–5M", "$5–20M", "$20M+", "unknown"}
    unexpected = set(rounds["amount_bucket"].dropna().unique()) - allowed_buckets
    if unexpected:
        raise SystemExit(f"ERROR: unexpected amount buckets: {sorted(unexpected)}")
    if not bool(rounds["state"].isin(US_STATE_CODES).all()):
        raise SystemExit("ERROR: a round has a state that is not a US state or DC.")
    last = rounds.groupby("cik")["observed_round_number"].transform("max")
    is_last = rounds["observed_round_number"].eq(last)
    if not bool(rounds.loc[is_last, "is_censored"].all()):
        raise SystemExit("ERROR: a company's latest round was not marked censored.")
    if bool(rounds.loc[~is_last, "is_censored"].any()):
        raise SystemExit("ERROR: an earlier round was marked censored.")
    if bool(rounds.loc[is_last, "months_to_next_round"].notna().any()):
        raise SystemExit("ERROR: a censored round has months_to_next_round filled in.")
    if bool(rounds.loc[~is_last, "months_to_next_round"].isna().any()):
        raise SystemExit("ERROR: an uncensored round is missing months_to_next_round.")
    is_first = rounds["observed_round_number"].eq(1)
    if bool(rounds.loc[is_first, "months_since_previous_round"].notna().any()):
        raise SystemExit("ERROR: round 1 has months_since_previous_round filled in.")
    if bool(rounds.loc[~is_first, "months_since_previous_round"].isna().any()):
        raise SystemExit("ERROR: a later round is missing months_since_previous_round.")
    expected = rounds.groupby("cik").cumcount() + 1
    if not bool(rounds["observed_round_number"].eq(expected).all()):
        raise SystemExit("ERROR: round numbers are not 1, 2, 3... within each company.")
    industry_key = rounds["company_industry"].fillna("__MISSING__")
    if bool(industry_key.groupby(rounds["cik"]).nunique().gt(1).any()):
        raise SystemExit("ERROR: a company has more than one company_industry.")
    if bool(rounds.groupby("cik")["is_startup"].nunique().gt(1).any()):
        raise SystemExit("ERROR: is_startup changes across a company's rounds.")


def main() -> int:
    report = QualityReport()
    tables = load_tables(report)
    for name, frame in tables.items():
        print(f"Concatenated {name}: {len(frame):,} rows")
    filings = join_filings(tables, report)
    del tables
    filings, date_stats, population = apply_cleaning_rules(filings, report)
    offerings = collapse_amendments(filings, report)
    rounds, startup_stats, company_attrs = build_rounds(offerings, report)
    startup_rounds = rounds.loc[rounds["is_startup"]].reset_index(drop=True)
    census_text = industry_census(company_attrs, offerings)
    entity_text = entity_distribution(company_attrs)
    behavior_text = startup_industry_behavior(startup_rounds)
    print()
    print(behavior_text)
    print()
    print(census_text)
    print()
    print(entity_text)

    venture_rounds, venture_stats, non_startups = build_venture_rounds(offerings, company_attrs, report)
    funnel = funnel_steps(population, startup_stats, venture_stats)
    funnel_text = format_funnel(funnel, venture_stats)
    industry_text = sector_preview(venture_rounds)
    examples_text = example_timelines(venture_rounds)
    print()
    print(funnel_text)
    print()
    print(industry_text)
    print()
    print(examples_text)

    validate_rounds(rounds)
    validate_rounds(venture_rounds)
    if venture_rounds.empty or not bool(venture_rounds["is_venture"].all()):
        raise SystemExit("ERROR: venture rounds must be non-empty and marked is_venture.")
    if not bool(venture_rounds["amount_sold"].gt(0).all()):
        raise SystemExit("ERROR: a venture round has TOTALAMOUNTSOLD of 0 or null.")
    if not bool(venture_rounds["venture_sector"].isin(_VENTURE_SECTOR_NAMES).all()):
        raise SystemExit("ERROR: a venture round has a sector outside the mapping.")

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    parquet_path = PROCESSED_DIR / "rounds.parquet"
    startup_path = PROCESSED_DIR / "startup_rounds.parquet"
    venture_path = PROCESSED_DIR / "venture_rounds.parquet"
    report_path = PROCESSED_DIR / "data_quality_report.md"
    funnel_path = PROCESSED_DIR / "funnel.json"
    non_startups_path = PROCESSED_DIR / "likely_non_startups.csv"
    rounds.to_parquet(parquet_path, index=False, engine="pyarrow")
    startup_rounds.to_parquet(startup_path, index=False, engine="pyarrow")
    venture_rounds.to_parquet(venture_path, index=False, engine="pyarrow")
    report_path.write_text(
        render_report(
            report,
            rounds,
            startup_rounds,
            startup_stats,
            date_stats,
            census_text,
            entity_text,
            behavior_text,
            funnel_text,
            industry_text,
            examples_text,
        ),
        encoding="utf-8",
    )
    funnel_path.write_text(json.dumps(funnel, indent=2) + "\n", encoding="utf-8")
    non_startups.sort_values(["rule", "cik"]).to_csv(non_startups_path, index=False)
    check = pd.read_parquet(parquet_path)
    startup_check = pd.read_parquet(startup_path)
    venture_check = pd.read_parquet(venture_path)
    print()
    print(
        f"Wrote {parquet_path} ({len(check):,} rounds, {check['cik'].nunique():,} companies), "
        f"{startup_path} ({len(startup_check):,} rounds, {startup_check['cik'].nunique():,} companies), "
        f"{venture_path} ({len(venture_check):,} rounds, {venture_check['cik'].nunique():,} companies), "
        f"{report_path}, {funnel_path}, and {non_startups_path} ({len(non_startups):,} companies)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
