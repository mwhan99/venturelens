"""Kaplan–Meier estimates of months until the next Form D round.

Reads pipeline/data/processed/venture_rounds.parquet. Does not modify the web app.

For each round, the clock starts at event_date. If a later Form D filing was
observed, the duration is months_to_next_round and the event is 1. Otherwise
the round is censored (event 0) at the latest FILING_DATE in the downloaded
Form D submissions, and the duration is the number of months from event_date
to that date. A month is 30.4375 days, the same length used to build the rounds.
The event is another Form D filing, not every fundraise: SAFEs, notes, and
rounds with no Form D are missing, so the rates are lower bounds.

Segments with fewer than MIN_ROUNDS rounds are written as "insufficient data"
so a later app can fall back to the sector-level estimate. Other/Unclassified
stays its own sector.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path

os.environ.setdefault("MPLCONFIGDIR", tempfile.mkdtemp(prefix="venturelens-mpl-"))

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from lifelines import KaplanMeierFitter

from build_dataset import DAYS_PER_MONTH, find_table, list_quarter_dirs, parse_dates, read_tsv

ROOT = Path(__file__).resolve().parents[1]
ROUNDS_PATH = ROOT / "pipeline" / "data" / "processed" / "venture_rounds.parquet"
BENCHMARKS_PATH = ROOT / "src" / "data" / "formd" / "benchmarks.json"
CHARTS_DIR = ROOT / "docs" / "charts"
KM_CHART_PATH = CHARTS_DIR / "km_by_sector.png"
FILED_AGAIN_CHART_PATH = CHARTS_DIR / "filed_again_24m_by_sector_amount.png"
# Superseded by the 24-month rate chart. Removed on each run if a previous build left it behind.
OLD_MEDIAN_CHART_PATH = CHARTS_DIR / "median_months_by_sector_amount.png"

MIN_ROUNDS = 100
# Offerings within 90 days are one round, so a later filing cannot show up before about 3 months.
MIN_GAP_MONTHS = 3
PROBABILITY_MONTHS = tuple(range(1, 37))
CONDITIONAL_MEDIAN_LABEL = "among rounds that were followed by another filing"
# A censored round dated on the dataset end has zero follow-up. Lifelines
# requires a positive duration, so those rounds are kept at a fraction of a month.
MIN_DURATION_MONTHS = 0.01

SECTOR_ORDER = (
    "Technology",
    "HealthTech/Biotech",
    "FinTech",
    "Energy/ClimateTech",
    "Consumer",
    "Other/Unclassified",
)
BUCKET_ORDER = ("<$1M", "$1–5M", "$5–20M", "$20M+")
STAGE_ORDER = ("1", "2", "3+")
SECTOR_COLORS = {
    "Technology": "#1f4e79",
    "HealthTech/Biotech": "#2a9d8f",
    "FinTech": "#e09f3e",
    "Energy/ClimateTech": "#588157",
    "Consumer": "#bc4749",
    "Other/Unclassified": "#6c757d",
}
BUCKET_COLORS = {
    "<$1M": "#b8c0cc",
    "$1–5M": "#7d8fa3",
    "$5–20M": "#3d5a80",
    "$20M+": "#1b263b",
}


def latest_filing_date() -> pd.Timestamp:
    """Administrative end of follow-up: the newest FILING_DATE in the download."""
    parsed: list[pd.Series] = []
    for quarter_dir in list_quarter_dirs():
        path = find_table(quarter_dir, "FORMDSUBMISSION")
        if path is None:
            continue
        frame, _, _ = read_tsv(path, ["FILING_DATE"])
        parsed.append(parse_dates(frame["FILING_DATE"]))
    if not parsed:
        raise SystemExit("ERROR: no FORMDSUBMISSION files found. Run pipeline/download.py first.")
    latest = pd.concat(parsed, ignore_index=True).max()
    if pd.isna(latest):
        raise SystemExit("ERROR: no FILING_DATE values could be parsed.")
    return pd.Timestamp(latest).normalize()


def load_rounds(end_date: pd.Timestamp) -> tuple[pd.DataFrame, int]:
    if not ROUNDS_PATH.exists():
        raise SystemExit(f"ERROR: {ROUNDS_PATH} does not exist. Run pipeline/build_dataset.py first.")
    rounds = pd.read_parquet(ROUNDS_PATH)
    required = {
        "cik",
        "event_date",
        "months_to_next_round",
        "is_censored",
        "venture_sector",
        "amount_bucket",
        "observed_round_number",
    }
    missing = sorted(required - set(rounds.columns))
    if missing:
        raise SystemExit(f"ERROR: venture rounds are missing columns: {', '.join(missing)}")
    rounds = rounds.copy()
    rounds["event_date"] = pd.to_datetime(rounds["event_date"])
    rounds["event"] = (~rounds["is_censored"].astype(bool)).astype(int)
    followup_months = ((end_date - rounds["event_date"]).dt.days / DAYS_PER_MONTH).round(2)
    rounds["duration"] = np.where(rounds["event"].eq(1), rounds["months_to_next_round"], followup_months)
    rounds["duration"] = pd.to_numeric(rounds["duration"], errors="coerce")
    bad_event = rounds["event"].eq(1) & (rounds["duration"].isna() | rounds["duration"].le(0))
    if bool(bad_event.any()):
        raise SystemExit(f"ERROR: {int(bad_event.sum()):,} observed next rounds have a non-positive duration.")
    clipped = int((rounds["event"].eq(0) & rounds["duration"].le(0)).sum())
    rounds.loc[rounds["event"].eq(0) & rounds["duration"].le(0), "duration"] = MIN_DURATION_MONTHS
    if bool(rounds["duration"].isna().any()):
        raise SystemExit("ERROR: a round has no duration.")
    stage_number = rounds["observed_round_number"].astype(int)
    rounds["stage"] = np.where(stage_number.ge(3), "3+", stage_number.astype(str))
    return rounds, clipped


def _json_number(value: float | None, digits: int) -> float | None:
    if value is None or not np.isfinite(value):
        return None
    return round(float(value), digits)


def fit_segment(frame: pd.DataFrame, *, fallback: str | None) -> dict[str, object]:
    n_rounds = int(len(frame))
    n_events = int(frame["event"].sum())
    result: dict[str, object] = {
        "n_rounds": n_rounds,
        "n_events": n_events,
    }
    if fallback is not None:
        result["fallback"] = fallback
    result["conditional_median_months"] = naive_median(frame)
    if n_rounds < MIN_ROUNDS:
        result["status"] = "insufficient data"
        result["km_median_months"] = None
        result["probability_another_filing_by_month"] = None
        return result

    model = KaplanMeierFitter()
    model.fit(frame["duration"], event_observed=frame["event"])
    median = float(model.median_survival_time_)
    survival = model.survival_function_at_times(list(PROBABILITY_MONTHS))
    survival_by_month = {int(index): float(value) for index, value in survival.items()}
    probabilities: dict[str, float | None] = {}
    for month in PROBABILITY_MONTHS:
        estimate = survival_by_month.get(month, np.nan)
        if pd.isna(estimate):
            probabilities[str(month)] = None
        else:
            probabilities[str(month)] = _json_number(1.0 - estimate, 3)
    result["status"] = "ok"
    result["km_median_months"] = _json_number(median, 2)
    result["probability_another_filing_by_month"] = probabilities
    return result


def segment_record(
    frame: pd.DataFrame,
    *,
    venture_sector: str | None,
    amount_bucket: str | None,
    stage: str | None,
    fallback: str | None,
) -> dict[str, object]:
    record = fit_segment(frame, fallback=fallback)
    record["venture_sector"] = venture_sector
    record["amount_bucket"] = amount_bucket
    record["stage"] = stage
    return record


def analyze(rounds: pd.DataFrame) -> dict[str, object]:
    overall = segment_record(
        rounds, venture_sector=None, amount_bucket=None, stage=None, fallback=None
    )
    by_sector = [
        segment_record(
            rounds.loc[rounds["venture_sector"].eq(sector)],
            venture_sector=sector,
            amount_bucket=None,
            stage=None,
            fallback=None,
        )
        for sector in SECTOR_ORDER
    ]
    by_amount: list[dict[str, object]] = []
    by_stage: list[dict[str, object]] = []
    for sector in SECTOR_ORDER:
        sector_rows = rounds.loc[rounds["venture_sector"].eq(sector)]
        for bucket in BUCKET_ORDER:
            by_amount.append(
                segment_record(
                    sector_rows.loc[sector_rows["amount_bucket"].eq(bucket)],
                    venture_sector=sector,
                    amount_bucket=bucket,
                    stage=None,
                    fallback="sector",
                )
            )
        for stage in STAGE_ORDER:
            by_stage.append(
                segment_record(
                    sector_rows.loc[sector_rows["stage"].eq(stage)],
                    venture_sector=sector,
                    amount_bucket=None,
                    stage=stage,
                    fallback="sector",
                )
            )
    unexpected = sorted(set(rounds["venture_sector"].dropna().unique()) - set(SECTOR_ORDER))
    if unexpected:
        print(f"warning: sectors not in the mapping were left out of the benchmarks: {', '.join(unexpected)}")
    return {
        "overall": overall,
        "by_sector": by_sector,
        "by_sector_and_amount_bucket": by_amount,
        "by_sector_and_stage": by_stage,
    }


def naive_median(frame: pd.DataFrame) -> float | None:
    observed = frame.loc[frame["event"].eq(1), "duration"]
    if observed.empty:
        return None
    return _json_number(float(observed.median()), 2)


def format_comparison(rounds: pd.DataFrame, results: dict[str, object]) -> str:
    overall = results["overall"]
    by_sector = {record["venture_sector"]: record for record in results["by_sector"]}
    lines = [
        "Conditional median: among rounds that were followed by another Form D filing.",
        "The Kaplan–Meier median also includes rounds with no later filing, followed until the dataset end date.",
        "A long KM median mostly means most rounds are never followed by another Form D filing.",
        "“not reached” means that estimated share stayed under 50%.",
        "",
        f"{'Sector':<22} {'Rounds':>8} {'Events':>8} {'Conditional':>14} {'KM median':>14} {'KM − cond.':>12}",
    ]
    ordered: list[tuple[str, pd.DataFrame, dict[str, object]]] = [
        ("Overall", rounds, overall),
    ]
    for sector in SECTOR_ORDER:
        ordered.append((sector, rounds.loc[rounds["venture_sector"].eq(sector)], by_sector[sector]))
    for label, frame, record in ordered:
        naive = record["conditional_median_months"]
        km_value = record["km_median_months"]
        naive_text = "n/a" if naive is None else f"{naive:.1f}"
        if km_value is None:
            km_text = "not reached"
            gap_text = "n/a"
        else:
            km_text = f"{km_value:.1f}"
            gap_text = "n/a" if naive is None else f"{km_value - naive:.1f}"
        lines.append(
            f"{label:<22} {int(record['n_rounds']):>8,} {int(record['n_events']):>8,} "
            f"{naive_text:>14} {km_text:>14} {gap_text:>12}"
        )
    return "\n".join(lines)


def plot_km_by_sector(rounds: pd.DataFrame) -> None:
    fig, ax = plt.subplots(figsize=(10.5, 6.2))
    for sector in SECTOR_ORDER:
        frame = rounds.loc[rounds["venture_sector"].eq(sector)]
        if len(frame) < MIN_ROUNDS:
            continue
        model = KaplanMeierFitter()
        model.fit(frame["duration"], event_observed=frame["event"], label=sector)
        model.plot_survival_function(ax=ax, ci_show=False, color=SECTOR_COLORS[sector], linewidth=2.0)
    ax.set_xlim(0, 96)
    ax.set_ylim(0, 1)
    ax.set_xlabel("Months since the round")
    ax.set_ylabel("Share not yet followed by another Form D filing")
    ax.set_title("Time until the next Form D filing, by sector")
    ax.axhline(0.5, color="#bbbbbb", linewidth=0.8, linestyle="--")
    ax.text(95, 0.515, "50%", ha="right", va="bottom", color="#888888", fontsize=8)
    ax.legend(title="Sector", frameon=False, loc="lower left")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    fig.tight_layout()
    fig.savefig(KM_CHART_PATH, dpi=160)
    plt.close(fig)


def plot_filed_again_24m(by_amount: list[dict[str, object]]) -> None:
    """Grouped bars of the 24-month Kaplan–Meier probability. Every segment is drawn."""
    lookup: dict[tuple[object, object], float] = {}
    for record in by_amount:
        probabilities = record.get("probability_another_filing_by_month") or {}
        value = probabilities.get("24") if isinstance(probabilities, dict) else None
        key = (record["venture_sector"], record["amount_bucket"])
        if not isinstance(value, (int, float)):
            raise SystemExit(
                "ERROR: missing 24-month probability for "
                f"{record['venture_sector']} {record['amount_bucket']} "
                f"({record.get('n_rounds')} rounds, status {record.get('status')})."
            )
        lookup[key] = float(value)

    fig, ax = plt.subplots(figsize=(12.4, 6.8))
    x = np.arange(len(SECTOR_ORDER))
    width = 0.18
    for index, bucket in enumerate(BUCKET_ORDER):
        heights = [lookup[(sector, bucket)] * 100.0 for sector in SECTOR_ORDER]
        offset = (index - (len(BUCKET_ORDER) - 1) / 2) * width
        bars = ax.bar(x + offset, heights, width=width, label=bucket, color=BUCKET_COLORS[bucket])
        for bar, height in zip(bars, heights):
            ax.text(
                bar.get_x() + bar.get_width() / 2,
                height + 0.4,
                f"{height:.1f}%",
                ha="center",
                va="bottom",
                rotation=90,
                fontsize=7,
                color="#222222",
            )
    ax.set_xticks(x, [sector.replace("/", "/\n") for sector in SECTOR_ORDER])
    ax.set_ylim(0, 58)
    ax.set_ylabel("Percent of rounds")
    ax.set_xlabel("Sector")
    ax.set_title("Share of rounds followed by another Form D filing within 24 months")
    ax.legend(title="Amount sold", frameon=False, loc="upper right")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    fig.tight_layout()
    fig.savefig(FILED_AGAIN_CHART_PATH, dpi=160)
    plt.close(fig)


def build_payload(end_date: pd.Timestamp, rounds: pd.DataFrame, results: dict[str, object], clipped: int) -> dict[str, object]:
    return {
        "dataset_end_date": end_date.date().isoformat(),
        "dataset_end_date_definition": (
            "Latest FILING_DATE in the downloaded Form D submissions. "
            "Rounds with no later Form D filing are censored on this date."
        ),
        "event_definition": (
            "Followed by another Form D filing. Many follow-on raises "
            "(SAFEs, convertible notes, rounds without a Form D) and shutdowns are invisible, "
            "so these rates are lower bounds on fundraising."
        ),
        "km_median_note": (
            "A long Kaplan–Meier median mostly means most rounds are never followed by another "
            "Form D filing. It does not mean the typical gap between filings is 5–7 years."
        ),
        "conditional_median_months_label": CONDITIONAL_MEDIAN_LABEL,
        "probability_another_filing_by_month_label": (
            "Kaplan–Meier probability that the round has been followed by another Form D filing "
            "by that month. Keys are months 1 through 36."
        ),
        "month_length_days": DAYS_PER_MONTH,
        "min_gap_months": MIN_GAP_MONTHS,
        "min_gap_note": (
            "Offerings within 90 days are merged into one round, so another filing cannot "
            "be observed before about 3 months. The probability is 0 for months 1–3 by "
            "construction. The app should say under 3 months is not measurable instead of showing 0%."
        ),
        "min_rounds": MIN_ROUNDS,
        "probability_months": list(PROBABILITY_MONTHS),
        "counts": {
            "rounds": int(len(rounds)),
            "companies": int(rounds["cik"].nunique()),
            "events": int(rounds["event"].sum()),
            "censored": int((rounds["event"] == 0).sum()),
            "nonpositive_followup_rounds": clipped,
        },
        **results,
    }


def print_amount_and_stage(results: dict[str, object]) -> None:
    print()
    print("Sector × amount bucket (KM median months, and share followed by another Form D filing by 24 months)")
    print(f"{'Sector':<22} {'Amount':<8} {'Rounds':>8} {'Status':<20} {'KM median':>12} {'By 24 months':>14}")
    for record in results["by_sector_and_amount_bucket"]:
        probs = record["probability_another_filing_by_month"] or {}
        by_24 = probs.get("24") if isinstance(probs, dict) else None
        median = record["km_median_months"]
        if record["status"] != "ok":
            median_text = "—"
        elif median is None:
            median_text = "not reached"
        else:
            median_text = f"{median:.1f}"
        print(
            f"{record['venture_sector']:<22} {record['amount_bucket']:<8} {record['n_rounds']:>8,} "
            f"{record['status']:<20} {median_text:>12} "
            f"{'—' if by_24 is None else f'{by_24:.1%}':>14}"
        )
    print()
    print("Sector × stage")
    print(f"{'Sector':<22} {'Stage':<6} {'Rounds':>8} {'Status':<20} {'KM median':>12} {'By 24 months':>14}")
    for record in results["by_sector_and_stage"]:
        probs = record["probability_another_filing_by_month"] or {}
        by_24 = probs.get("24") if isinstance(probs, dict) else None
        median = record["km_median_months"]
        median_text = (
            "not reached"
            if median is None and record["status"] == "ok"
            else ("—" if median is None else f"{median:.1f}")
        )
        print(
            f"{record['venture_sector']:<22} {record['stage']:<6} {record['n_rounds']:>8,} "
            f"{record['status']:<20} {median_text:>12} "
            f"{'—' if by_24 is None else f'{by_24:.1%}':>14}"
        )


def main() -> int:
    end_date = latest_filing_date()
    rounds, clipped = load_rounds(end_date)
    results = analyze(rounds)
    payload = build_payload(end_date, rounds, results, clipped)
    BENCHMARKS_PATH.parent.mkdir(parents=True, exist_ok=True)
    CHARTS_DIR.mkdir(parents=True, exist_ok=True)
    BENCHMARKS_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    plot_km_by_sector(rounds)
    plot_filed_again_24m(results["by_sector_and_amount_bucket"])
    if OLD_MEDIAN_CHART_PATH.exists():
        OLD_MEDIAN_CHART_PATH.unlink()

    comparison = format_comparison(rounds, results)
    print(f"Dataset end date (latest FILING_DATE): {end_date.date().isoformat()}")
    print(
        f"Rounds {payload['counts']['rounds']:,}  "
        f"companies {payload['counts']['companies']:,}  "
        f"events {payload['counts']['events']:,}  "
        f"censored {payload['counts']['censored']:,}"
    )
    if clipped:
        print(f"Censored rounds with no positive follow-up, kept at {MIN_DURATION_MONTHS} months: {clipped:,}")
    print()
    print(comparison)
    print_amount_and_stage(results)
    print()
    size_bytes = BENCHMARKS_PATH.stat().st_size
    print(f"Wrote {BENCHMARKS_PATH} ({size_bytes:,} bytes, {size_bytes / 1024:.1f} KB)")
    if size_bytes > 300 * 1024:
        raise SystemExit(f"ERROR: benchmarks.json is {size_bytes / 1024:.1f} KB, above the 300 KB limit.")
    print(f"Wrote {KM_CHART_PATH}")
    print(f"Wrote {FILED_AGAIN_CHART_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
