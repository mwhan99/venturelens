from download import newer_quarters, quarter_from_url, quarter_of_date

BASE = "https://www.sec.gov/files/structureddata/data/form-d-data-sets"


def test_reads_the_quarter_from_the_zip_name():
    assert quarter_from_url(f"{BASE}/2026q3_d.zip") == (2026, 3)
    assert quarter_from_url(f"{BASE}/2008q2_d_0.zip") == (2008, 2)
    assert quarter_from_url(f"{BASE}/readme.zip") is None


def test_maps_the_end_date_to_its_quarter():
    assert quarter_of_date("2026-09-30") == (2026, 3)
    assert quarter_of_date("2026-10-01") == (2026, 4)
    assert quarter_of_date("2027-03-31") == (2027, 1)


def test_finds_only_quarters_after_the_website_data():
    urls = [f"{BASE}/2026q2_d.zip", f"{BASE}/2026q3_d.zip"]
    assert newer_quarters(urls, "2026-09-30") == []
    assert newer_quarters(urls + [f"{BASE}/2026q4_d.zip"], "2026-09-30") == ["2026q4"]
    assert newer_quarters(urls + [f"{BASE}/2027q1_d.zip", f"{BASE}/2026q4_d.zip"], "2026-09-30") == ["2026q4", "2027q1"]
