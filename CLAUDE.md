# CLAUDE.md

Guide to the VentureLens repository for Claude and for Meng (the owner).
Meng is new to web development. When working here, **explain each step in
plain English**: what you are about to do, why, and how to check it worked.

VentureLens turns the SEC's public **Form D** filings (the notice a US
company files when it raises money privately) into a dataset of startup
funding rounds. It answers questions that paid databases like PitchBook
usually charge for, such as *"how likely is a startup like this one to raise
again before its cash runs out?"* It also has a screening calculator
(runway, MOIC, IRR, risk flags, investment memo) for a single startup.

- Live site: https://venturelens-chi.vercel.app (Next.js on Vercel). This is
  the link on Meng's résumé.
- Repo: https://github.com/mwhan99/venturelens
- Sister project: HiddenHire (`/Users/meng/Documents/HiddenHire`, live at
  https://hidden-hire.vercel.app). Its CLAUDE.md is a useful reference for
  how things were done there (Supabase, scheduled GitHub jobs, golden tests).

**The rebuild (section 4).** Today the site's front door is a calculator
running on 10 made-up companies, and the real Form D analysis is only in the
README. The rebuild puts the real data first: a home page that tells the
story, an interactive "fundraising odds" explorer, and a lookup for any
company that filed a Form D. The calculator stays as one part of the site,
not the whole site.

Numbers below were checked against the data on Oct 26, 2026.

---

## Working rules

- **The live site must keep working.** Meng is job hunting and the link is
  on applications.
  - Work on a branch and merge with a pull request that Meng merges. After
    each merge, open https://venturelens-chi.vercel.app and check it loads.
  - Old addresses (`/analyze`, `/portfolio`, `/memo`, `/compare`, …) must
    keep working. If a page moves, add a redirect.
- **This Next.js version (16.3.6) differs from older ones.** Read the
  matching guide in `node_modules/next/dist/docs/` before writing Next.js
  code.
- Use package versions that have been out for at least about a week.
- Check web changes with `npm run lint` and `npm run build`. Don't run
  `npm run build` while `npm run dev` is running: they share `.next/` and
  the dev server breaks until restarted.
- Run `npm test` (Vitest 4) before and after any change in `src/lib/`.
  The tests check the NovaPay reference case, the case matches for all 10
  demo companies, and the Form D benchmark lookup. If a test fails after a
  deliberate change, update the expected value in the same pull request and
  say why.
- **`src/data/formd/benchmarks.json` and `docs/charts/*.png` are generated**
  by `pipeline/analyze.py`. Never edit them by hand; change the Python and
  re-run it.
- Every number on the site that comes from Form D must come from a
  generated file (or, later, the database), never be typed into a page.
  Then a data refresh can't leave a wrong number behind.
- The pipeline's rules are documented in `pipeline/DECISIONS.md` and its
  results in `pipeline/FINDINGS.md`. If a rule or a result changes, update
  those files in the same pull request.
- Always keep the limitations visible: a later Form D filing is a **lower
  bound** on fundraising (SAFEs, notes and some rounds never appear), and
  rounds under 3 months apart can't be measured. Pages must say "not
  measurable" rather than show 0%.
- Secrets (the SEC user-agent email, later the Supabase keys) go in
  environment variables, GitHub Actions secrets or Vercel settings, never in
  the repo.
- Verify on the real deployed site, not only on localhost.

---

## 1. What each file does

### The website (Next.js 16, React 19, Tailwind 4, TypeScript)

Run it locally with `npm run dev`, then open http://localhost:3000.
Everything is in `src/`. The `@/` in imports means `src/`.

| File | What it does |
|---|---|
| `src/app/layout.tsx` | The frame around every page: IBM Plex Sans/Mono fonts, page title, and `AppShell`. |
| `src/app/globals.css` | Background and text colours, fonts, and print rules for the memo. |
| `src/components/AppShell.tsx`, `Sidebar.tsx` | The dark navy left sidebar (menu of 7 pages) and the phone menu button. |
| `src/components/PageChrome.tsx`, `MetricCard.tsx`, `icons.tsx`, `SimulatedBadge.tsx`, `RecentStartups.tsx` | Shared pieces: page headers, number cards, icons, the "Simulated" label, the recent-startups list. |
| `src/app/page.tsx` | **Dashboard.** Summary cards and recently saved startups. Empty until the visitor clicks "Load demo dataset". |
| `src/app/analyze/page.tsx` + `src/components/analyze/` | **Analyze Startup.** The input form, results, Bear/Base/Bull scenarios, risk flags, the Form D financing benchmark card, and "Save". |
| `src/app/portfolio/page.tsx`, `portfolio/[id]/page.tsx` + `src/components/portfolio/` | **Portfolio** list and one page per saved company, with historical case matches and the "Load demo dataset" button. |
| `src/app/memo/page.tsx` + `components/memo/` | **Investment Memo**, printable to PDF. The text is written by `src/lib/memo/buildMemo.ts`. |
| `src/app/compare/page.tsx` + `components/compare/` | **Compare Startups** side by side; trade-off sentences come from `src/lib/compare/insights.ts`. |
| `src/app/benchmark/page.tsx` + `components/benchmark/` | **Dataset Benchmark.** Compares saved companies with the median of the *other saved companies*, which are usually the made-up demo ones. |
| `src/app/cases/page.tsx` | **Historical Cases.** Just a message pointing to Portfolio; the matching itself shows on company pages. |
| `src/lib/finance/engine.ts` | The core math (see section 3a). |
| `src/lib/finance/scenarios.ts`, `risk.ts`, `parse.ts`, `format.ts` | Bear/Base/Bull rules, risk-flag thresholds, reading typed numbers, number display. |
| `src/lib/cases/`, `src/data/historical-cases.ts` | Turns risk flags into tags and matches them to 5 sourced failure cases (WeWork, Fast, Airlift, Bird, Theranos). |
| `src/lib/formd/benchmarks.ts` | Looks up the Form D benchmark for a startup's sector and check size (see section 3b). |
| `src/data/formd/benchmarks.json` | **Generated** by `pipeline/analyze.py`. The Form D results the site reads (about 54 KB). |
| `src/data/demo-dataset.ts` | The 10 made-up demo startups (NovaPay, CloudCore, MedFlow, …). |
| `src/data/form-options.ts` | The industry and stage lists in the form. |
| `src/lib/storage/` | Saves companies in the visitor's browser (`localStorage`, key `venturelens.companies.v1`). Nothing is shared between visitors or devices. |
| `src/lib/dashboard/summary.ts`, `src/lib/benchmark/dataset.ts` | Numbers for the dashboard cards and the Dataset Benchmark page. |
| `src/lib/**/*.test.ts`, `vitest.config.mts` | The tests, run with `npm test`. `finance/novapay.test.ts` is the hand-checked NovaPay case (analysis, Bear/Base/Bull, risk flags). `cases/match.test.ts` fixes which historical cases each demo company matches. `formd/benchmarks.test.ts` checks the sector and size mapping, a real lookup (FinTech $1–5M at 16 months = 23%), the 36-month cap and "not measurable" under 3 months. |
| `next.config.ts` | Turns off the Next.js dev indicator. Nothing else. |
| `public/*.svg` | Leftover starter images from create-next-app. Unused. |

All calculation runs **in the visitor's browser**. There is no server code
and no database today.

### The data pipeline (Python, `pipeline/`)

| File | What it does |
|---|---|
| `pipeline/download.py` | Reads the SEC's Form D data-sets page, downloads every quarterly zip (2008 Q1 → 2026 Q3, 75 zips, about 1.2 GB unzipped) into `pipeline/data/raw/`, skips ones already there, and waits 0.2 s between requests. Needs `SEC_USER_AGENT="Name email"` set, because the SEC refuses anonymous requests. |
| `pipeline/build_dataset.py` | Cleans the filings into funding rounds (section 2). Writes three files to `pipeline/data/processed/` plus `data_quality_report.md`. |
| `pipeline/analyze.py` | Kaplan–Meier analysis of "time until another Form D filing". Writes `src/data/formd/benchmarks.json` and the two charts in `docs/charts/`. |
| `pipeline/DECISIONS.md` | Why each cleaning rule exists and where it can be wrong. |
| `pipeline/FINDINGS.md` | The results in words. Its **Validation** table is still empty. |
| `pipeline/README.md` | How to run the three scripts, and what each output column means. |
| `pipeline/requirements.txt` | pandas, pyarrow, requests, lifelines 0.30.0, matplotlib. The local virtual environment `pipeline/.venv` uses Python 3.14. |

Raw zips, processed parquet files and the virtual environment are
git-ignored. Only `benchmarks.json` and the charts are committed. The
pipeline is **run by hand**; nothing refreshes it automatically.

### Other files

| File | What it does |
|---|---|
| `README.md` | The public write-up: problem, features, formulas, data, limitations. |
| `docs/screenshots/`, `docs/charts/` | README images. |
| `VentureLens_MVP.xlsx` | The original Excel model the app grew from (sheets: Startup_Input, Calculated Metrics, Scenario_Analysis, Risk_Flags, Compare_Startups, Benchmark). Not in git. |
| `.tools/` | A private copy of Node 22, git-ignored. The Mac's normal Node (v24, `/usr/local/bin/node`) is what's used. |
| `.gitignore` | Ignores caches, `.env*`, `node_modules`, the pipeline's raw and processed data, and `AGENTS.md`. |

---

## 2. Where the data comes from

**Source.** The SEC publishes every Form D as quarterly zip files of
tab-separated tables. VentureLens uses three tables: `FORMDSUBMISSION`
(filing date, new or amendment), `ISSUERS` (the company) and `OFFERING`
(industry, amounts, dates).

**Cleaning, in order** (details in `pipeline/DECISIONS.md`):
1. One row per filing; keep only the main company on each filing.
2. Drop investment funds (hedge funds, PE funds and similar).
3. Keep US states and DC only.
4. Event date = first-sale date when usable, otherwise the filing date.
5. Amendments are folded into the original filing, not counted as new rounds.
6. Offerings from the same company within **90 days** of a round's start
   are merged into one round.
7. **Startup** = first round seen is in 2010 or later, *and* the company was
   under about five years old at the time.
8. **Venture-relevant** = a venture industry (mapped to 6 sectors:
   Technology, HealthTech/Biotech, FinTech, Energy/ClimateTech, Consumer,
   Other/Unclassified), a corporation or LLC, and more than $0 sold.

**Outputs** (in `pipeline/data/processed/`, git-ignored):

| File | Rows | Companies | What's in it |
|---|---|---|---|
| `rounds.parquet` | 247,406 | 166,601 | Every operating-company round, startup or not |
| `startup_rounds.parquet` | (subset) | | Startups only |
| `venture_rounds.parquet` | 114,695 | 68,441 | Venture-relevant startups. **The benchmark dataset.** About 3 MB on disk. |

Rounds per year in the benchmark set peak in **2021 (9,548)** and fall to
6,508 in 2025. 2026 has data through Sept 30 only. The biggest states are CA
(25,375 rounds), NY (12,695), MA, TX and FL.

**Well-known names.** Figma, Airbnb, Plaid and Ramp are in `rounds.parquet`.
Stripe, Inc. (11 rounds) and Notion Labs are in it but are **not** counted
as startups, because their first filing here says they were over five years
old. So a company lookup must search `rounds.parquet` and explain why a
company is or isn't in the benchmark. Some names are shared by unrelated
filers (for example "BREX … DST" real-estate trusts), so results must show
the state and industry to tell them apart.

---

## 3. What the site calculates

### 3a. The screening calculator (`src/lib/finance/`)

- Runway (months) = cash ÷ (annual burn ÷ 12)
- Post-money = pre-money + investment
- Ownership = investment ÷ post-money, then × (1 − expected future dilution)
- Exit value = revenue × (1 + growth)^years × exit revenue multiple
- MOIC = (exit value × diluted ownership) ÷ investment
- IRR = MOIC^(1 / years) − 1
- **Scenarios:** Base = the user's inputs. Bear = half the growth, multiple
  − 2 (at least 1), dilution + 10 points (at most 90%). Bull = growth × 1.25,
  multiple + 2, dilution − 5 points (at least 0).
- **Risk flags** (positive / neutral / caution): growth ≥ 50% / 20–50% /
  < 20%; runway ≥ 18 / 12–18 / < 12 months; gross margin ≥ 70% / 50–70% /
  < 50%; largest customer < 15% / 15–30% / ≥ 30%; Bull–Bear IRR spread
  < 25 / 25–50 / ≥ 50 points.
- **Historical cases:** a company matches a case when they share at least 2
  risk tags.

### 3b. The Form D benchmarks (`pipeline/analyze.py` → `benchmarks.json`)

- The "event" is **another Form D filing** by the same company. A round with
  no later filing by Sept 30, 2026 is "still being watched" (censored), not
  "failed".
- **Kaplan–Meier** estimates, for months 1–36, the chance that a round has
  been followed by another filing. It handles recent rounds fairly: they
  count only for the months they've actually been watched.
- Months 1–3 are 0 by construction because of the 90-day merge, so pages
  must say "under 3 months: not measurable" (`min_gap_months: 3`).
- **Conditional median**: among rounds that *were* followed by another
  filing, the typical gap (about 14 months in every sector).
- Results are split by sector, by sector × amount bucket (`<$1M`, `$1–5M`,
  `$5–20M`, `$20M+`) and by sector × stage (observed round 1, 2, 3+).
  Groups with fewer than 100 rounds are marked insufficient, and the site
  falls back to the sector number.
- In the calculator, a startup's industry is mapped to a sector, its
  **investment amount** is used as a stand-in for round size, and its
  runway picks the month to read. If runway is shorter than the typical gap,
  the card is shown as a caution.

Headline results (FINDINGS.md): 32.7% of rounds are followed by another
filing within 24 months; Technology 37.6% and HealthTech/Biotech 36.8%
are tied; $1–5M rounds beat both the smallest and the largest; companies on
their 3rd+ observed round are far more likely to file again.

---

## 4. Rebuild plan

**Goal:** VentureLens leads with the real Form D data. A recruiter who opens
the link sees real numbers and a clear story in the first second, and can
try something interactive with no setup. The calculator stays, as "apply
the data to one startup".

### The new site map

| Page | What it shows | Data from |
|---|---|---|
| `/` **Home** | The story: headline numbers (114,695 rounds, 68,441 startups, 2010–2026), rounds per year with the 2021 peak, the key findings, and buttons to the explorer and lookup | generated files |
| `/explore` **Fundraising odds** | Pick sector, round size and stage. See the chance of another filing by month 6, 12, 18, 24, 36 on a curve, the typical gap, how many rounds it's based on, and a comparison with all startups. The choices live in the address, so every view is a shareable link. | `benchmarks.json` |
| `/companies` **Company lookup** | Search any Form D filer by name. Its page shows every round (date, amount, investors), the gaps between them, and whether it's in the benchmark and why not. | database (Phase D) |
| `/screen` **Screen a startup** | Today's Analyze, Portfolio, Memo and Compare, grouped. The Form D benchmark card is moved to the top, and the demo companies load automatically, so nothing is ever empty. | browser |
| `/methodology` **Methodology** | Plain-English version of DECISIONS.md and FINDINGS.md: the funnel from 365,344 filers to 68,441 startups, the cleaning rules, the statistics, the validation table, and the limitations. | generated files |

Pages and features to remove: the **Dataset Benchmark** page (it compares
made-up companies with each other) and the standalone **Historical Cases**
page (it's empty). Case matching can stay inside each company page, clearly
labelled as an illustration from 5 cases. Old addresses redirect to their
new homes.

### Steps

Each step ends with a check. Don't start the next step until it passes.

**Phase A — groundwork (the live site doesn't change)**

1. **Save this guide and check deployment.** Remove `CLAUDE.md` from
   `.gitignore` and commit this file on a branch. Confirm in Vercel that the
   project redeploys on every push to `main` and makes a preview link for
   every pull request. *Check:* the pull request shows a Vercel preview link.
2. **Real tests for the calculator.** Add Vitest and turn the two
   validation scripts into tests (`npm test`), so the math is checked
   automatically before moving pages around. *Check:* `npm test` passes, and
   fails if a formula is deliberately broken. *(Done: 23 tests; Vitest 5
   was skipped because it needs `@types/node` 22+.)*
3. **More generated data from the pipeline.** Extend `analyze.py` (or a new
   `pipeline/summarize.py`) to write a small `src/data/formd/summary.json`:
   the cleaning funnel, rounds and median amount per year by sector, the top
   states, and the headline numbers. No page reads it yet. Add pytest tests
   for the new functions. *Check:* the numbers match
   `data_quality_report.md` and section 2 above.
4. **Fill in the validation table** in FINDINGS.md for 8–10 well-known
   startups (for example Figma, Airbnb, Plaid, Ramp): rounds reported in the
   press versus rounds found in Form D. *Check:* Meng reads and agrees with
   each row.

**Phase B — design**

5. **Design pass.** Make 2–3 small mockups of the new home page in
   different styles, in a `design-options/` folder. Meng picks one, which
   sets the colours, fonts and layout for every page. It must look different
   from HiddenHire (navy, cobalt blue, Inter, "data briefing") and from
   Parrot (pink, pastel, centred hero). *Check:* Meng picks a design.

**Phase C — the real-data pages (no database needed)**

All of these read generated files, so they are prebuilt and load instantly.

6. **New layout and home page.** Swap the sidebar for the chosen design's
   navigation and build `/`. *Check:* every number on the page matches
   `summary.json`/`benchmarks.json`; the page looks right at phone width.
7. **Fundraising odds explorer** (`/explore`). Charts are hand-drawn SVG or a
   small chart library, decided in step 5. *Check:* for Technology, all
   sizes, the 24-month number reads 37.6%; "under 3 months: not measurable"
   appears where it should.
8. **Methodology page** (`/methodology`). *Check:* Meng reads it and it's
   accurate and easy to follow.
9. **Move the calculator to `/screen`.** Regroup Analyze, Portfolio, Memo and
   Compare under it. Load the demo companies on first visit. Remove the two
   weak pages. Add redirects from the old addresses. *Check:* `npm test`
   still passes; every old address lands on a working page; a fresh private
   window never shows an empty dashboard.

**Phase D — company lookup (needs a database)**

68,441 startups (166,601 filers in total) are too many to bundle into the
site, so the lookup needs a small database. The plan reuses HiddenHire's
setup.

10. **Supabase.** Create a free Supabase project with a `filers` table and
    a `rounds` table (read-only for the website), plus a fast name search.
    Write `pipeline/supabase_sync.py` to load `rounds.parquet` into it. Add a
    daily "ping" GitHub job so the free project is never paused. *Check:*
    the row counts in Supabase match section 2 (247,406 rounds).
11. **Lookup pages** (`/companies` and `/companies/[cik]`). *Check:*
    searching "Figma" shows Figma, Inc.'s rounds; searching "Stripe" shows
    Stripe, Inc. with a note explaining why it isn't in the benchmark.

**Phase E — keep it fresh, then polish**

12. **Quarterly refresh.** A scheduled GitHub job runs download → build →
    analyze → sync after the SEC posts each new quarter, then opens a pull
    request with the new `benchmarks.json`, `summary.json` and charts for
    Meng to merge. It never commits straight to `main`. *Check:* run it by
    hand once; the pull request shows only data changes.
13. **Polish.** Link previews (an Open Graph image), sitemap, page titles,
    loading and error states, and a phone check. *Check:* test on a real
    phone; paste the link into LinkedIn or iMessage and see the preview.
14. **Switch the story over.** Rewrite the README around the data, refresh
    the screenshots, and update the one-line description Meng uses on the
    résumé and LinkedIn. *Check:* the README's numbers match the live site.

### Decisions (approved by Meng, Oct 26, 2026)

1. **Keep the calculator** as a smaller `/screen` section.
2. **Build the company lookup** with Supabase (Phase D).
3. **Remove the Dataset Benchmark and Historical Cases pages**, keeping case
   matching only inside company pages.
4. **Keep the name VentureLens** and the address
   `venturelens-chi.vercel.app`, so the link on the résumé keeps working.
