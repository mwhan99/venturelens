import pandas as pd
import pytest

from build_dataset import format_funnel, funnel_steps
from summarize import (
    build_summary,
    by_amount_bucket,
    by_sector,
    by_year,
    check_consistency,
    funnel_with_shares,
    headline,
    top_states,
)


def make_rounds() -> pd.DataFrame:
    """Six rounds from four companies, small enough to check by hand."""
    rows = [
        # cik, state, sector, date, amount, bucket
        ("A", "NY", "Technology", "2021-03-01", 500_000, "<$1M"),
        ("A", "NY", "Technology", "2022-06-01", 3_000_000, "$1–5M"),
        ("B", "CA", "Technology", "2021-09-01", 2_000_000, "$1–5M"),
        ("C", "CA", "FinTech", "2022-01-15", 10_000_000, "$5–20M"),
        ("D", "MA", "Consumer", "2026-02-01", 800_000, "<$1M"),
        ("D", "MA", "Consumer", "2026-08-01", 25_000_000, "$20M+"),
    ]
    frame = pd.DataFrame(
        rows, columns=["cik", "state", "venture_sector", "event_date", "amount_sold", "amount_bucket"]
    )
    frame["event_date"] = pd.to_datetime(frame["event_date"])
    return frame


END_DATE = pd.Timestamp("2026-09-30")

FUNNEL = [
    {"step": "All filings", "companies": 10, "rows": 20, "row_unit": "filings"},
    {"step": "Startups", "companies": 8, "rows": 12, "row_unit": "startup rounds"},
    {"step": "Completed rounds", "companies": 4, "rows": 6, "row_unit": "venture rounds"},
]


def test_headline_counts_rounds_companies_and_median():
    assert headline(make_rounds()) == {
        "rounds": 6,
        "companies": 4,
        # Sorted amounts: 0.5M, 0.8M, 2M, 3M, 10M, 25M -> median (2M + 3M) / 2.
        "median_amount_sold": 2_500_000,
        "states": 3,
        "first_year": 2021,
        "last_year": 2026,
    }


def test_by_year_counts_each_company_once_per_year_and_marks_partial_year():
    years = {record["year"]: record for record in by_year(make_rounds(), END_DATE)}
    assert list(years) == [2021, 2022, 2026]
    assert years[2021]["rounds"] == 2
    assert years[2021]["companies"] == 2
    assert years[2026]["rounds"] == 2
    assert years[2026]["companies"] == 1
    assert years[2021]["rounds_by_sector"] == {"Technology": 2, "Consumer": 0, "FinTech": 0}
    assert [years[year]["partial"] for year in years] == [False, False, True]


def test_year_is_not_partial_when_data_runs_to_december_31():
    records = by_year(make_rounds(), pd.Timestamp("2026-12-31"))
    assert not any(record["partial"] for record in records)


def test_by_sector_orders_by_rounds_with_shares():
    records = by_sector(make_rounds())
    assert [record["venture_sector"] for record in records] == ["Technology", "Consumer", "FinTech"]
    assert records[0] == {
        "venture_sector": "Technology",
        "rounds": 3,
        "companies": 2,
        "share_of_rounds": 0.5,
        "median_amount_sold": 2_000_000,
    }


def test_by_amount_bucket_lists_every_bucket_in_order():
    records = by_amount_bucket(make_rounds())
    assert [(record["amount_bucket"], record["rounds"]) for record in records] == [
        ("<$1M", 2),
        ("$1–5M", 2),
        ("$5–20M", 1),
        ("$20M+", 1),
    ]


def test_top_states_breaks_ties_by_state_code():
    records = top_states(make_rounds(), limit=2)
    # CA, MA and NY all have 2 rounds; alphabetical order decides.
    assert [(record["state"], record["rounds"]) for record in records] == [("CA", 2), ("MA", 2)]
    assert records[0]["companies"] == 2
    assert records[1]["companies"] == 1


def test_funnel_shares():
    records = funnel_with_shares(FUNNEL)
    assert [record["share_of_previous"] for record in records] == [None, 0.8, 0.5]
    assert [record["share_of_all"] for record in records] == [1.0, 0.8, 0.4]


def test_summary_has_no_dollar_totals():
    summary = build_summary(make_rounds(), FUNNEL, END_DATE)
    assert "total_amount_sold" not in summary["headline"]
    assert all("total_amount_sold" not in record for record in summary["by_year"])
    assert summary["dataset_end_date"] == "2026-09-30"


def test_consistency_check_catches_a_stale_funnel():
    rounds = make_rounds()
    check_consistency(build_summary(rounds, FUNNEL, END_DATE), FUNNEL)
    stale = FUNNEL[:-1] + [{**FUNNEL[-1], "rows": 7}]
    with pytest.raises(SystemExit):
        check_consistency(build_summary(rounds, stale, END_DATE), stale)


def test_funnel_steps_and_text_from_build_dataset():
    population = {
        "all_filings": 20,
        "all_companies": 10,
        "operating_filings": 18,
        "operating_companies": 9,
        "us_filings": 16,
        "us_companies": 8,
    }
    startup_stats = {"startup_companies": 6, "startup_rounds": 9}
    venture_stats = {
        "venture_companies": 5,
        "relevant_offerings": 8,
        "completed_companies": 4,
        "completed_rounds": 7,
        "likely_startup_companies": 3,
        "venture_rounds": 6,
        "incomplete_offerings": 1,
    }
    steps = funnel_steps(population, startup_stats, venture_stats)
    assert [(step["step"], step["companies"], step["rows"]) for step in steps] == [
        ("All filings", 10, 20),
        ("Operating companies", 9, 18),
        ("US", 8, 16),
        ("Startups", 6, 9),
        ("Venture-relevant", 5, 8),
        ("Completed rounds", 4, 7),
        ("Likely startups", 3, 6),
    ]
    text = format_funnel(steps, venture_stats)
    assert "Likely startups                   3          75.0%            6  venture rounds" in text
