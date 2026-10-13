# Form D pipeline

This folder turns the SEC's public Form D data sets into a table of startup fundraising rounds. It does not modify the VentureLens web app.

Form D is the notice a company files when it sells securities under Regulation D (or Section 4(a)(5)). Each quarterly zip is a set of tab-separated tables. The pipeline keeps operating-company filings, collapses amendments into the original offering, and merges offerings that are part of the same round.

## Setup

From the repository root:

```bash
python3 -m venv pipeline/.venv
source pipeline/.venv/bin/activate
pip install -r pipeline/requirements.txt
```

The SEC will not answer requests that hide who is calling. Set a user agent with your name and a contact email before downloading:

```bash
export SEC_USER_AGENT="Your Name you@example.com"
```

## Run

Still from the repository root, with the virtualenv active:

```bash
python pipeline/download.py
python pipeline/build_dataset.py
```

`download.py` reads the zip links from the SEC Form D data-sets page, so it picks up whichever quarters are posted (the path of the zip changes by year). It saves each zip under `pipeline/data/raw/`, skips a file that is already there, and unzips that quarter into its own folder. It waits 0.2 seconds between SEC requests.

`build_dataset.py` reads those folders only. Run the download first. Re-running the build overwrites the outputs below.

Downloaded zips, extracted files, the virtualenv, and the generated dataset are gitignored.

## Outputs

`pipeline/data/processed/rounds.parquet` has one row per funding round, including companies that are not startups. `pipeline/data/processed/startup_rounds.parquet` has the same columns and only the companies flagged `is_startup`. `pipeline/data/processed/venture_rounds.parquet` keeps venture-relevant startups only, and only rounds built from offerings with a final amount sold greater than zero. It adds `venture_sector` and `is_venture`.

| Column | Meaning |
|---|---|
| `cik` | SEC company identifier, 10 digits |
| `entity_name` | Issuer name from the latest filing in the round |
| `state` | US state or DC from the issuer's state/country field |
| `industry` | Form D industry group on this round |
| `company_industry` | Industry group from the company's first observed round. Grouping uses this, so each company has one industry |
| `revenue_range` | Revenue range as filed |
| `event_date` | Date of the original notice: first-sale date when that date is usable, otherwise the filing date |
| `event_date_source` | `SALE_DATE` or `FILING_DATE` |
| `amount_sold` | Dollars sold, summed across offerings merged into the round. Null when the filer reported no number |
| `amount_bucket` | `<$1M`, `$1–5M`, `$5–20M`, `$20M+`, or `unknown` |
| `investor_count` | Largest investor count reported on the filings in the round |
| `observed_round_number` | 1, 2, 3... in event-date order for rounds seen in this Form D extract. Not the company's true lifetime round number |
| `is_startup` | True when the first observed round is on or after 2010-01-01 and the company reported being under about five years old then |
| `venture_sector` | VentureLens sector from the company's first-round industry. Only on `venture_rounds.parquet` |
| `is_venture` | True on every row of `venture_rounds.parquet`. The other two files do not have this column |
| `months_since_previous_round` | Months since the previous observed round. Null for observed round 1 |
| `months_to_next_round` | Months until the next observed round. Null when this is the latest observed round |
| `is_censored` | True when no later round is in the data. The company may still raise after the extract ends |
| `n_offerings` | How many offerings were merged into this round |

`pipeline/data/processed/data_quality_report.md` records rows skipped while loading, row counts before and after every cleaning step, the share removed by each rule, how often the event date came from the sale date versus the filing date, how many companies and rounds are startups versus excluded, the industry and entity-type mapping, the funnel from all filings through completed venture rounds, and how many rounds each company has.

The build prints every industry and entity type with company counts, then the funnel, a sector preview for the venture set (median months until the next completed round, uncensored rounds only), and five venture timelines with three or four observed rounds.

Why each rule exists, and where it can be wrong, is in `DECISIONS.md`.
