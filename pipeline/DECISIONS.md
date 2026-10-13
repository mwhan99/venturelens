# Cleaning decisions

These are the choices in `build_dataset.py`, why they were made, and where they can be wrong. The goal of this phase is a dataset of operating-company fundraising events, not a survival model.

## Where the files come from

The SEC posts one zip per quarter on the Form D data-sets page. The zip URL is not one pattern: older quarters live under `/files/structureddata/...` (some named `2009q1_d_0.zip`) and recent quarters live under `/files/datastandardsinnovation/...` (named `2026q3_d.zip`). `download.py` scrapes the hrefs on that page instead of hardcoding either pattern, so a newly posted quarter is picked up and a renamed path does not silently skip a year.

The SEC asks callers to send a User-Agent that identifies them, and to stay at or below 10 requests per second. The script reads `SEC_USER_AGENT` and stops with an error if it is missing. It sleeps 0.2 seconds between requests. A zip that is already on disk is not downloaded again. Each zip is extracted into its own folder so quarters cannot overwrite each other.

The published files are tab-separated and use a `.tsv` extension. The loader also accepts `.txt`, because the format is what matters. Only the columns listed in the build script are read, as strings. Dates and numbers are parsed in a later step so a value like `Indefinite` is not turned into a missing number by the CSV reader before we can count it.

A row whose field count does not match the header is skipped and counted. If a file is not valid UTF-8, the loader tries cp1252 and then latin-1. A bad byte does not abort the quarter.

## One row per filing

Three tables are concatenated across quarters and joined on `ACCESSIONNUMBER`:

- `FORMDSUBMISSION` supplies the filing date and whether the submission is `D` or `D/A`.
- `ISSUERS` supplies the company. Only the primary issuer is kept (`IS_PRIMARYISSUER_FLAG` true / yes). Co-issuers are a different legal entity on the same notice, and treating them as separate startups would double-count the round.
- `OFFERING` supplies industry, amounts, dates, and the amendment link.

The join is an inner join. A filing that is missing from any of the three tables cannot be turned into a complete event, so it is dropped and the drop is counted. If the same accession shows up in more than one quarter, the later quarter is kept.

Columns that are loaded but not used as filters (`JURISDICTIONOFINC`, `ENTITYTYPE`, `ISEQUITYTYPE`, `ISDEBTTYPE`) are still read so a renamed or removed source column shows up as a warning. `INVESTMENTFUNDTYPE` is counted in the quality report and is not, by itself, a reason to drop a row. `YEAROFINC_TIMESPAN_CHOICE` and `YEAROFINC_VALUE_ENTERED` are used only to flag startups, described below.

## Drop investment funds

A row is dropped when `INDUSTRYGROUPTYPE` is "Pooled Investment Fund" or `ISPOOLEDINVESTMENTFUNDTYPE` is true. Those filings are hedge funds, private equity funds, and similar vehicles raising from their own investors. They are not operating startups, and leaving them in would dominate both the company counts and the "next round" gaps.

This can be wrong in two directions. An operating company that checked the fund box is removed. A fund that left both fields blank is kept. The report counts rows that have `INVESTMENTFUNDTYPE` filled in but matched neither drop condition; those rows stay, because the rule was limited to the two fields above.

## US issuers only

`STATEORCOUNTRY` has to be a US state or the District of Columbia. The SEC stores that field as a code. Standard postal abbreviations are kept, including `DC`. Full state names are mapped to those abbreviations when they appear. Codes that are not states are removed. That includes foreign country and province codes the SEC uses (`E9`, `A6`, and similar), and it includes US territories such as Puerto Rico, because the rule is states and DC only.

The field is the state or country on the issuer record, not `JURISDICTIONOFINC`. A Cayman company with a New York address stays in. A Delaware company that reported a foreign address is removed. Both are limitations of using this one field as the definition of a US issuer.

## Event date

The date of the event is `SALE_DATE` when that value parses as a date, is not after the day the script runs, and `YETTOOCCUR` is not true. Otherwise it is `FILING_DATE`. If neither date parses, the row is dropped. The column `event_date_source` records which one was used.

`SALE_DATE` is the date of first sale, which is closer to when the round actually happened than the day the notice was filed. It is rejected when it is in the future, because a future first-sale date is not an event yet. It is also rejected when `YETTOOCCUR` is true: the filer said the first sale has not happened, so a date in that field is not usable even if one is present. The filing date is the fallback so those companies are not thrown out.

Quarters do not share one date format. Older files use `2009-03-31 17:22:50`. Newer files use `29-MAR-2024`. Both are parsed explicitly; anything left over is parsed with a general parser, and failures become null rather than errors.

## Amounts

`TOTALAMOUNTSOLD` and `TOTALOFFERINGAMOUNT` are parsed after the text is clean. `Indefinite` becomes null. So do blanks, other non-numeric text, and negative numbers. Zero stays zero: the filer reported that nothing had been sold. Commas and dollar signs are stripped before parsing.

Null is not the same as zero. Later steps do not treat a missing amount as $0.

## Amendments are not new rounds

An amendment (`ISAMENDMENT` true, or `SUBMISSIONTYPE` of `D/A`) updates an offering the company already filed. Counting it as a new round would make every update look like a successful next raise.

Each amendment is walked back through `PREVIOUSACCESSIONNUMBER` until the walk reaches a new notice (a filing that is not an amendment). Chains are followed, so an amendment of an amendment still lands on the original notice. Cycles and links that point at an accession outside the cleaned data stop the walk.

If `PREVIOUSACCESSIONNUMBER` is missing, or the chain cannot be resolved, the amendment is attached to the most recent new notice from the same CIK whose event date is on or before the amendment's event date. If that company has no earlier new notice, the amendment is kept as its own offering instead of being deleted.

The offering keeps the original notice's event date. `TOTALAMOUNTSOLD` and `TOTALNUMBERALREADYINVESTED` come from the most recent filing in the chain that contains a parsed number, so a later blank amendment does not wipe out a real amount, and the latest reported figure is the one that is kept. Name, state, industry, and revenue range come from the latest filing, carrying the last non-blank value forward.

The CIK fallback can attach an amendment to the wrong offering when the company has filed a newer new notice and the amendment's link is missing. That should be uncommon: the accession link is filled in on the amendments checked while building this pipeline, and the quality report counts how often the fallback is used.

## What counts as one round

After amendments are collapsed, a company can still have several offerings close together: a second "new" Form D filed instead of an amendment, or a rolling close split across notices. Offerings from the same CIK are sorted by event date. An offering joins the current round when its event date is within 90 days of that round's first offering. The next offering outside that window starts the next round. `ROUND_MERGE_WINDOW_DAYS` at the top of `build_dataset.py` is that 90.

The window is anchored on the first date so that every offering in the round falls within 90 days of the start. They are within 90 days of each other. A chain of offerings that are each 80 days apart does not collapse into one multi-year round. The cost of that choice is the opposite error: an offering 80 days after the previous one can still open a new round if it is more than 90 days after the round's start.

Amounts sold are summed. Null amounts are ignored; if every offering in the round has a null amount, the round amount stays null. Investor count is the maximum reported on those offerings, not a sum, because adding the counts would double-count investors when two filings describe one close.

`observed_round_number` is 1, 2, 3... in event-date order inside this extract. It counts rounds observed in the cleaned Form D data, not the company's true funding-round history. A raise before the files begin, a raise that was not filed on Form D, or a filing removed by an earlier rule (a fund, a non-US issuer) never appears, so observed round 1 is often not the company's first round. `months_since_previous_round` and `months_to_next_round` are the day gap divided by 30.4375 (the average month length), rounded to two decimals. Observed round 1 has no previous gap. The latest observed round has no next gap.

`is_censored` is true on that latest round. It means a later round has not been observed in this extract. It does not mean the company failed, shut down, or refused to raise. Many of those companies will file again after the last quarter in the download. The industry preview's median `months_to_next_round` uses uncensored rounds only, so it describes companies that did raise again and is not a survival estimate.

Amount buckets are `<$1M` (under 1,000,000, including zero), `$1–5M` (from 1,000,000 up to but not including 5,000,000), `$5–20M` (from 5,000,000 up to but not including 20,000,000), `$20M+` (20,000,000 and above), and `unknown` when the amount is null.

## Limits that no cleaning rule can remove

Not every startup files Form D. The form covers exempt offerings under Rule 504, Rule 506(b), Rule 506(c), and Section 4(a)(5). A company that raises only from venture funds on a registered or otherwise unreported path, or that never sells securities this way, is absent. Companies outside the US state filter are absent even when they are real startups.

Amounts are whatever the issuer typed. They can be indefinite, rounded, cumulative across an amendment, or wrong. `TOTALAMOUNTSOLD` on an amendment is the total sold in the offering so far, which is why the latest figure replaces the earlier one instead of being added. Summing is reserved for distinct offerings that the 90-day rule decides are the same round.

A new offering after 90 days is a proxy for "this company raised again." It is not proof that the previous round succeeded, that the company is healthy, or that the new filing is a priced equity round. Debt and equity flags are loaded and not used to define a round. A follow-on filing can be a bridge, an extension, or a different security.

The 90-day merge is a judgment call. Shorten it and one rolling close splits into two rounds. Lengthen it and two real raises collapse into one. The constant is the place to change it.

The survival curves inherit that floor. A later round cannot start inside the 90-day window, which is about 3 months, so the probability of another Form D filing is 0 for months 1–3 by construction. `src/data/formd/benchmarks.json` sets `min_gap_months` to 3. The app should say "under 3 months: not measurable" instead of showing 0%.

The extract starts and ends with the quarters on the SEC page. A company's first round may predate the extract, and its next round may not have been filed yet. Both make `observed_round_number` and `is_censored` depend on the window of data, not on the company's full life.

## Which companies count as startups

The rules above still keep older public companies. PlasmaTech and Lattice showed up in an early spot-check because a US operating company that files Form D is not the same thing as an early-stage startup. Employee plans, oil and gas programs, and repeat issuers all file the same form.

`is_startup` is set from the company's first observed round, then copied onto every later round. Both of these have to be true:

1. The first observed round's event date is on or after 2010-01-01 (`STARTUP_FIRST_ROUND_ON_OR_AFTER`). The download starts in 2008. A "first" round in 2008 or 2009 has almost no earlier filings behind it, so it is easier to mistake a long-running issuer for a new one. Requiring 2010 leaves two years of Form D history in which an earlier round would have shown up.
2. That same round shows a young company. The form asks whether the issuer was incorporated "Within Last Five Years." The data file stores that answer as `withinFiveYears` (also accepted if the text is the English label). Separately, `YEAROFINC_VALUE_ENTERED` counts when the four-digit year is within five calendar years of the event date, in either direction. Either signal is enough. A blank year does not block a company that checked the five-year choice, and a year inside the window counts even if the choice says "over five years" or is blank.

The year and the choice are taken from the original notice of the first offering in that first round. If that notice left them blank, the next offering in the same round can fill them in. A later round cannot. A company that was old at its first observed round stays excluded even if a later filing looks young.

`company_industry` is the `INDUSTRYGROUPTYPE` on that same first observed round, carried onto every round for the company. Industry previews group by this column, so a company that later files under a different industry is counted once.

`rounds.parquet` keeps every company, with `is_startup` true or false. `startup_rounds.parquet` is the startup companies only, including their later rounds. Dropping the older issuers from the full file would make the exclusion impossible to audit.

This still is not a list of venture-backed startups. A five-year-old company can be public, a subsidiary, or a reincorporation. A real startup that left both year fields blank, or whose first Form D in this extract is an amendment we could not link, will be excluded. The 2010 floor also drops young companies whose only observed rounds are in 2008–2009.

## Which startups count as venture-relevant

The startup cut still keeps single-purpose vehicles. Commercial real estate, REITs, investing programs, and oil and gas issuers file Form D for one deal, so they look like a company with a single round. They are not venture startups. `venture_rounds.parquet` is the subset used for that question. `rounds.parquet` and `startup_rounds.parquet` stay as they were, so the cut can be checked.

A startup is venture-relevant when both of these are true for the first observed round:

1. `INDUSTRYGROUPTYPE` is in `VENTURE_SECTOR_BY_INDUSTRY` at the top of `build_dataset.py`, and the mapping gives it a sector rather than excluding it. The sector is copied onto every later round as `venture_sector`. A value that is not in the dict is unmapped: it is printed and left out. It is not given a guessed sector. The form's travel group is three labels in the file (`Lodging and Conventions`, `Other Travel`, `Tourism and Travel Services`), and all three map to Consumer. FinTech industries are only the ones that already survived the pooled-fund drop.
2. `ENTITYTYPE` is Corporation or Limited Liability Company. Limited Partnership, General Partnership, and Business Trust are deal vehicles or funds, so they are excluded. Any other value, including Other and a blank, is printed and not kept.

Excluded industries, because they are mostly property, resource, or investing vehicles: Commercial, Construction, REITS and Finance, Residential, Other Real Estate, Investing, Oil and Gas, Coal Mining, and Airlines and Airports.

`Other` was in that excluded list at first. The label is a residual bucket, and it was the largest startup industry, so it was treated like the single-deal vehicles next to it. The follow-on rate says otherwise. Among startups, later observed rounds per company (uncensored rounds divided by companies) are 0.033 for Commercial (617 later rounds, 18,692 companies), 0.822 for Other Technology (19,599 later rounds, 23,848 companies), and 0.455 for Other (12,940 later rounds, 28,446 companies). Computers and Telecommunications, the rest of Technology, are 0.723 and 0.730. Other sits with operating-company industries such as Business Services (0.441) and Manufacturing (0.585), not with Commercial, Residential (0.044), or REITS and Finance (0.052). Median amount sold on startup rounds is $750,000 for Other, $1,424,340 for Other Technology, and $1,200,000 for Commercial. Deal size does not separate them. The later-round rate does.

`Other` is therefore mapped to its own sector, `Other/Unclassified`, and included in `venture_rounds.parquet`. The Corporation and Limited Liability Company rule still applies, so an `Other` issuer that is a partnership or business trust stays out. The category is mixed: it holds companies that did not fit a listed industry, not a coherent market. Downstream benchmarks should report `Other/Unclassified` as its own sector. They should not fold it into Technology, HealthTech/Biotech, FinTech, Energy/ClimateTech, or Consumer.

Sectors that are kept:

| VentureLens sector | Form D INDUSTRYGROUPTYPE |
|---|---|
| Technology | Computers, Telecommunications, Other Technology |
| HealthTech/Biotech | Biotechnology, Pharmaceuticals, Health Insurance, Hospitals and Physicians, Other Health Care |
| FinTech | Commercial Banking, Insurance, Investment Banking, Other Banking and Financial Services |
| Energy/ClimateTech | Electric Utilities, Energy Conservation, Environmental Services, Other Energy |
| Consumer | Retailing, Restaurants, Lodging and Conventions, Other Travel, Tourism and Travel Services, Agriculture, Manufacturing, Business Services |
| Other/Unclassified | Other |

An offering whose final `TOTALAMOUNTSOLD` is 0 or null is not a completed round. Those offerings are counted, then left out of the venture 90-day merge. The other two parquet files still include them. `observed_round_number`, the gaps, and `is_censored` in `venture_rounds.parquet` are recomputed from the remaining offerings, so they can differ from `startup_rounds.parquet` when a zero-dollar filing was part of a company's history. `is_venture` is true on every row in that file. `company_industry` stays the industry from the original first observed round, including when that round's amount was zero and the round itself is not in the venture file.
