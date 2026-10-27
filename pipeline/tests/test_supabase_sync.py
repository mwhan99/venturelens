import pandas as pd
import pytest

from supabase_sync import base_url, benchmark_status, build_tables, check_tables, clean, headers, normalize_name, small_int

SYNCED = "2026-10-27T00:00:00+00:00"


def make_rounds() -> pd.DataFrame:
    rows = [
        # cik, name, round, date, amount, is_startup, industry
        ("A", "Acme Robotics, Inc.", 1, "2021-01-01", 1_000_000, True, "Other Technology"),
        ("A", "Acme Robotics Inc", 2, "2022-06-01", 5_000_000, True, "Other Technology"),
        ("B", "LAVA TOPCO, INC.", 1, "2022-10-19", 6_000_000, True, "Other"),
        ("C", "Old Steel Corp", 1, "2009-05-01", 2_000_000, False, "Manufacturing"),
        ("D", "Sunny Apartments LLC", 1, "2020-01-01", 900_000, True, "Residential"),
        ("E", "Quiet Labs Inc.", 1, "2021-01-01", 0, True, "Biotechnology"),
        ("F", "Venture Partners LP", 1, "2021-01-01", 3_000_000, True, "Other Technology"),
    ]
    frame = pd.DataFrame(rows, columns=["cik", "entity_name", "observed_round_number", "event_date", "amount_sold", "is_startup", "company_industry"])
    frame["event_date"] = pd.to_datetime(frame["event_date"])
    frame["state"] = "NY"
    frame["industry"] = frame["company_industry"]
    for col in ("event_date_source", "amount_bucket", "revenue_range"):
        frame[col] = None
    frame["investor_count"] = pd.array([5, 9, 4, 2, 1, None, 3], dtype="Int64")
    frame["months_since_previous_round"] = [None, 17.0, None, None, None, None, None]
    frame["months_to_next_round"] = [17.0, None, None, None, None, None, None]
    frame["n_offerings"] = 1
    return frame


VENTURE = pd.DataFrame({"cik": ["A", "A"], "venture_sector": ["Technology", "Technology"]})
NON_STARTUPS = pd.DataFrame({"cik": ["B"], "detail": ["Name looks like a buyout, SPAC or fund vehicle: LAVA TOPCO, INC."]})
ALIASES = pd.DataFrame({"cik": ["A"], "brand": ["Acme"]})


def test_each_filer_gets_the_first_reason_that_applies():
    tables = build_tables(make_rounds(), VENTURE, NON_STARTUPS, ALIASES, SYNCED)
    status = {f["cik"]: f["benchmark_status"] for f in tables["filers"]}
    assert status == {
        "A": "benchmark",
        "B": "likely_non_startup",
        "C": "not_young",
        "D": "non_venture_industry",
        "E": "no_completed_round",
        "F": "other_legal_form",
    }
    by = {f["cik"]: f for f in tables["filers"]}
    assert by["A"]["venture_sector"] == "Technology"
    assert by["B"]["venture_sector"] is None  # only benchmark companies get a sector
    assert by["B"]["status_detail"].startswith("Name looks like")
    assert by["A"]["name"] == "Acme Robotics Inc"  # the latest filing's name
    assert by["A"]["round_count"] == 2 and by["A"]["completed_round_count"] == 2
    assert by["E"]["completed_round_count"] == 0


def test_names_include_every_filing_name_and_brand_aliases():
    tables = build_tables(make_rounds(), VENTURE, NON_STARTUPS, ALIASES, SYNCED)
    acme = sorted((n["name"], n["source"]) for n in tables["filer_names"] if n["cik"] == "A")
    assert acme == [("Acme", "brand"), ("Acme Robotics Inc", "filing"), ("Acme Robotics, Inc.", "filing")]


def test_rounds_are_json_safe():
    tables = build_tables(make_rounds(), VENTURE, NON_STARTUPS, ALIASES, SYNCED)
    first = tables["rounds"][0]
    assert first["event_date"] == "2021-01-01"
    assert first["months_since_previous"] is None
    assert tables["rounds"][5]["investor_count"] is None
    assert all(r["synced_at"] == SYNCED for r in tables["rounds"])


def test_a_filer_with_no_name_gets_a_stand_in():
    rounds = make_rounds()
    rounds["entity_name"] = rounds["entity_name"].astype("string")
    rounds.loc[rounds["cik"] == "D", "entity_name"] = pd.NA
    tables = build_tables(rounds, VENTURE, NON_STARTUPS, ALIASES, SYNCED)
    by = {f["cik"]: f for f in tables["filers"]}
    assert by["D"]["name"] == "Unnamed filer (SEC ID D)"
    assert not any(n["cik"] == "D" for n in tables["filer_names"])  # nothing blank to search
    check_tables(tables, VENTURE)


def test_an_impossible_investor_count_is_stored_as_unknown():
    rounds = make_rounds()
    rounds.loc[0, "investor_count"] = 100_000_000_000
    tables = build_tables(rounds, VENTURE, NON_STARTUPS, ALIASES, SYNCED)
    assert tables["rounds"][0]["investor_count"] is None
    assert tables["rounds"][1]["investor_count"] == 9


def test_an_alias_for_an_unknown_company_stops_the_sync():
    with pytest.raises(SystemExit):
        build_tables(make_rounds(), VENTURE, NON_STARTUPS, pd.DataFrame({"cik": ["ZZZ"], "brand": ["Ghost"]}), SYNCED)


def test_check_tables_catches_a_benchmark_mismatch():
    tables = build_tables(make_rounds(), VENTURE, NON_STARTUPS, ALIASES, SYNCED)
    check_tables(tables, VENTURE)
    with pytest.raises(SystemExit):
        check_tables(tables, pd.DataFrame({"cik": ["A", "C"], "venture_sector": ["Technology", "Consumer"]}))


@pytest.mark.parametrize(
    "raw, expected",
    [("X.AI CORP.", "xai corp"), ("Maplebear  Inc.", "maplebear inc"), ("JAND, Inc.", "jand inc"), ("  Brex — Inc ", "brex inc")],
)
def test_normalize_name(raw, expected):
    assert normalize_name(raw) == expected


def test_status_order_puts_benchmark_first():
    assert benchmark_status("X", is_startup=False, industry="Residential", completed_rounds=0, venture_ciks={"X"}, excluded={"X": "r"})[0] == "benchmark"


def test_url_and_key_handling():
    assert base_url("https://abc.supabase.co/rest/v1/") == "https://abc.supabase.co"
    assert base_url("https://abc.supabase.co") == "https://abc.supabase.co"
    assert "Authorization" not in headers("sb_secret_123")
    assert headers("eyJhbGc")["Authorization"] == "Bearer eyJhbGc"
    assert clean(float("nan")) is None and clean(pd.NA) is None
    assert small_int(2_147_483_647) == 2_147_483_647 and small_int(2_147_483_648) is None and small_int(None) is None
