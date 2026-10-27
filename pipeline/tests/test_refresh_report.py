from refresh_report import changed_values, headline, money, report


def files(rounds, companies, p24, end="2026-09-30"):
    summary = {"dataset_end_date": end, "headline": {"rounds": rounds, "companies": companies, "median_amount_sold": 1_400_000}}
    odds = {str(m): 0.1 for m in range(1, 37)}
    odds["24"] = p24
    benchmarks = {"overall": {"probability_another_filing_by_month": odds, "conditional_median_months": 14.52}}
    return summary, benchmarks


def test_formats_numbers_like_the_site():
    before = headline(*files(113436, 67516, 0.328))
    assert before["Rounds"] == "113,436"
    assert before["Raised again within 24 months"] == "32.8%"
    assert money(1_400_000) == "$1.40M"
    assert money(2_000_000) == "$2M"
    assert money(850_000) == "$850,000"


def test_marks_changes_and_lists_old_values_to_retype():
    before = headline(*files(113436, 67516, 0.328))
    after = headline(*files(117002, 69100, 0.331, end="2026-12-31"))
    values = changed_values(before, after)
    assert "67,516" in values and "32.8%" in values and "113,436" in values
    assert "$1.40M" not in values  # unchanged
    text = report(before, after, ["- `README.md:12` still says **32.8%**"])
    assert "| Raised again within 24 months | 32.8% | 33.1% ✱ |" in text
    assert "| Median round size | $1.40M | $1.40M |" in text
    assert "README.md:12" in text


def test_says_so_when_nothing_needs_retyping():
    same = headline(*files(113436, 67516, 0.328))
    assert "No hand-typed numbers" in report(same, same, [])
