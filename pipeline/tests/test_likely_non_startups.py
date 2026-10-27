import pandas as pd
import pytest

from build_dataset import EXCLUDED_COMPANIES_PATH, likely_non_startups, load_excluded_companies


def make_rounds() -> pd.DataFrame:
    rows = [
        # cik, entity_name, observed_round_number, revenue_range
        ("1", "Acme Robotics, Inc.", 1, "Decline to Disclose"),
        ("1", "Acme Robotics, Inc.", 2, "$1 - $1,000,000"),
        ("2", "LAVA TOPCO, INC.", 1, "Decline to Disclose"),
        ("3", "Old Steel Corp", 1, "Over $100,000,000"),
        # The revenue rule looks only at the first observed round.
        ("4", "Grown Up Software, Inc.", 1, "$1,000,001 - $5,000,000"),
        ("4", "Grown Up Software, Inc.", 2, "Over $100,000,000"),
        ("5", "Typo Holdings Co", 1, "Decline to Disclose"),
        # A vehicle name on any round counts, including a renamed later round.
        ("6", "Bright Clinic, LLC", 1, "Decline to Disclose"),
        ("6", "Bright Clinic Parent, LLC", 2, "Decline to Disclose"),
        # Whole words only: "Parenting" and "Holdcom" are not vehicle names.
        ("7", "Parenting Apps Inc.", 1, "Decline to Disclose"),
        ("8", "Holdcom Networks, Inc.", 1, "Decline to Disclose"),
    ]
    return pd.DataFrame(rows, columns=["cik", "entity_name", "observed_round_number", "revenue_range"])


REVIEWED = pd.DataFrame(
    [{"cik": "5", "entity_name": "Typo Holdings Co", "reason": "Implausible amount: $48.0B sold to 1 investor"}]
)


def test_each_rule_and_the_companies_it_keeps():
    result = likely_non_startups(make_rounds(), REVIEWED).set_index("cik")
    assert result["rule"].to_dict() == {
        "2": "vehicle_name",
        "3": "established_revenue",
        "5": "reviewed",
        "6": "vehicle_name",
    }
    assert result.loc["5", "detail"] == "Implausible amount: $48.0B sold to 1 investor"
    assert result.loc["6", "entity_name"] == "Bright Clinic Parent, LLC"
    assert result.loc["6", "rounds"] == 2


def test_reviewed_list_wins_over_other_rules():
    reviewed = pd.DataFrame([{"cik": "2", "entity_name": "LAVA TOPCO, INC.", "reason": "Checked by hand"}])
    result = likely_non_startups(make_rounds(), reviewed).set_index("cik")
    assert result.loc["2", "rule"] == "reviewed"


@pytest.mark.parametrize(
    "name",
    ["Picard HoldCo, Inc.", "Oranje TopCo, Inc.", "Hawk Parent LLC", "Kraken Intermediate, LLC",
     "Digital World Acquisition Corp.", "KKR Private Equity Conglomerate LLC", "Some Midco LLC",
     "Hold Co Partners, Inc.", "Bidco 2 Ltd", "XYZ Merger Sub, Inc."],
)
def test_vehicle_names(name):
    rounds = pd.DataFrame(
        [{"cik": "9", "entity_name": name, "observed_round_number": 1, "revenue_range": None}]
    )
    assert likely_non_startups(rounds, REVIEWED.iloc[0:0])["rule"].tolist() == ["vehicle_name"]


def test_the_committed_review_list_is_well_formed():
    reviewed = load_excluded_companies(EXCLUDED_COMPANIES_PATH)
    assert reviewed["cik"].str.fullmatch(r"\d{10}").all()
    assert reviewed["reason"].str.len().gt(0).all()
