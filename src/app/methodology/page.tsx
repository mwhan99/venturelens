import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import benchmarks from "@/data/formd/benchmarks.json";
import summary from "@/data/formd/summary.json";
import { VALIDATION, validationTotals } from "@/data/validation";
import { count, longDate, pct } from "@/lib/formd/summary";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How VentureLens turns SEC Form D filings into startup funding rounds, how it measures the odds of raising again, and how it was checked.",
};

const REPO = "https://github.com/mwhan99/venturelens";

const SECTIONS = [
  { id: "in-short", title: "In short" },
  { id: "form-d", title: "What Form D is" },
  { id: "funnel", title: "From filings to startups" },
  { id: "rounds", title: "What counts as a round" },
  { id: "odds", title: "Measuring “raising again”" },
  { id: "validation", title: "Checking it against reality" },
  { id: "limits", title: "What it can’t tell you" },
  { id: "calculator", title: "The screening calculator" },
  { id: "built", title: "How it’s built" },
] as const;

function Section({ id, children }: { id: (typeof SECTIONS)[number]["id"]; children: ReactNode }) {
  const title = SECTIONS.find((s) => s.id === id)!.title;
  return (
    <section id={id} className="min-w-0 scroll-mt-6 rounded-[18px] border border-line bg-card p-6 sm:rounded-[22px] sm:p-8">
      <h2 className="font-display text-[26px] font-bold leading-tight tracking-[-0.03em]">{title}</h2>
      <div className="mt-4 grid gap-4 text-[16px] leading-relaxed [&_b]:font-semibold">{children}</div>
    </section>
  );
}

const RULE_TEXT: Record<string, { label: string; text: string }> = {
  vehicle_name: {
    label: "Buyout, SPAC and fund vehicles",
    text: "names like “…TopCo”, “…HoldCo”, “…Parent” or “…Acquisition Corp”. A private-equity buyout creates a brand-new company, so it looks young.",
  },
  established_revenue: {
    label: "Established businesses",
    text: "reported revenue over $100 million at their first round here. Young startups don’t.",
  },
  reviewed: {
    label: "Checked by hand",
    text: "billion-dollar filings the rules miss: a $48 billion “round” from one investor, a cluster of identical $1.5 billion filings from exactly 11 investors, investment funds, and subsidiaries of public companies.",
  },
};

export default function MethodologyPage() {
  const rules = summary.rules;
  const funnel = summary.funnel;
  const head = summary.headline;
  const totals = validationTotals();
  const merge = rules.round_merge_window_days;
  const startYear = rules.startup_first_round_on_or_after.slice(0, 4);
  const maxFunnel = funnel[0].companies;

  const stepText: Record<string, ReactNode> = {
    "All filings": "Every Form D notice the SEC has published as data, joined across its three tables (the filing, the company, the offering).",
    "Operating companies": "Investment funds are dropped: hedge funds, private-equity funds and similar pools raising from their own investors.",
    US: "Only companies whose address is in a US state or DC.",
    Startups: (
      <>
        The company’s first round seen here is in {startYear} or later <b>and</b> it was under about {rules.young_company_years} years
        old at the time. This drops long-running businesses that also file Form D.
      </>
    ),
    "Venture-relevant": "Industries mapped to six sectors (Technology, HealthTech/Biotech, FinTech, Energy/ClimateTech, Consumer, Other), and corporations or LLCs only. Real-estate deals, oil and gas programs and investing vehicles are dropped.",
    "Completed rounds": "Offerings that actually sold something (amount above $0), merged into rounds.",
    "Likely startups": "Companies that look like something other than a startup are moved out (see below).",
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6">
      <section className="mb-4 min-w-0 rounded-[18px] border border-line bg-card p-6 sm:mb-5 sm:rounded-[22px] sm:p-9">
        <span className="inline-block rounded-full bg-lime px-2.5 py-1 text-[13px] font-bold">Methodology</span>
        <h1 className="mt-4 font-display text-[clamp(32px,4.4vw,52px)] font-bold leading-[1.04] tracking-[-0.04em]">
          How the numbers are made
        </h1>
        <p className="mt-3 max-w-[42em] text-lg text-muted">
          Where the data comes from, how it’s cleaned, how “raising again” is measured, and how it was checked against real
          companies. The full technical write-ups are{" "}
          <a className="font-semibold text-brand hover:underline" href={`${REPO}/blob/main/pipeline/DECISIONS.md`}>
            DECISIONS.md
          </a>{" "}
          and{" "}
          <a className="font-semibold text-brand hover:underline" href={`${REPO}/blob/main/pipeline/FINDINGS.md`}>
            FINDINGS.md
          </a>
          .
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-[210px_1fr] lg:gap-5">
        <nav aria-label="On this page" className="hidden lg:block">
          <ol className="sticky top-6 grid gap-1 rounded-[18px] border border-line bg-card p-3 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="block rounded-lg px-2.5 py-1.5 font-medium text-muted hover:bg-background hover:text-ink">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="grid min-w-0 gap-4 sm:gap-5">
          <Section id="in-short">
            <ul className="grid gap-3">
              <li>
                <b>Source:</b> the SEC’s public Form D data, every quarter it has published through{" "}
                {longDate(summary.dataset_end_date)}, covering {count(funnel[0].companies)} companies.
              </li>
              <li>
                <b>Cleaned</b> down to {count(head.rounds)} funding rounds by {count(head.companies)} US startups (
                {head.first_year}–{head.last_year}).
              </li>
              <li>
                <b>Measured:</b> how often, and how soon, a round is followed by another Form D filing from the same company.
                Overall, {pct(benchmarks.overall.probability_another_filing_by_month["24"])} within 24 months.
              </li>
              <li>
                <b>Checked:</b> for {totals.companies} well-known startups, {totals.matched} of their {totals.reported} publicly reported
                rounds appear in the data.
              </li>
            </ul>
          </Section>

          <Section id="form-d">
            <p>
              When a US company sells shares or other securities privately, without a public offering, it usually relies on an
              exemption called <b>Regulation D</b>. It’s then supposed to file a short notice with the SEC, <b>Form D</b>, within 15
              days of the first sale.
            </p>
            <p>
              The notice is public. It lists the company, its state and industry, how much it set out to raise, how much it has
              sold, how many investors bought in, and the date of the first sale. The SEC publishes all of them as free quarterly
              data sets. Paid databases like PitchBook combine this kind of filing with press releases and surveys; VentureLens uses
              the filings alone.
            </p>
            <p className="rounded-[14px] bg-brand-soft p-4">
              <b>The catch:</b> not every raise produces a Form D. SAFEs and convertible notes often don’t, and research finds most
              venture-backed rounds have no Form D at all. That’s why every rate on this site is a <b>lower bound</b>.
            </p>
          </Section>

          <Section id="funnel">
            <p>Each step keeps a smaller, cleaner set of companies.</p>
            <ol className="grid gap-3">
              {funnel.map((step, i) => (
                <li key={step.step} className="grid gap-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold">
                      {i + 1}. {step.step}
                    </span>
                    <span className="font-display text-lg font-bold">{count(step.companies)}</span>
                  </div>
                  <div className="h-3 rounded-full bg-background" aria-hidden="true">
                    <div
                      className={`h-3 rounded-full ${i === funnel.length - 1 ? "bg-coral" : "bg-brand"}`}
                      style={{ width: `${Math.max(1.5, (step.companies / maxFunnel) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[15px] text-muted">{stepText[step.step] ?? null}</p>
                </li>
              ))}
            </ol>
            <div className="rounded-[14px] bg-background p-4">
              <p className="font-semibold">The last step: companies that aren’t really startups</p>
              <ul className="mt-2 grid gap-2 text-[15px]">
                {summary.exclusions.map((e) => (
                  <li key={e.rule}>
                    <b>{RULE_TEXT[e.rule]?.label ?? e.rule}</b> ({count(e.companies)} companies, {count(e.rounds)} rounds):{" "}
                    {RULE_TEXT[e.rule]?.text}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[15px] text-muted">
                Removing them changed the headline rates by less than half a percentage point. It’s done so that no page presents a
                buyout shell or a typo as a startup. A few real startups are caught by mistake (one packaging startup files as
                “…Holdco”), and DECISIONS.md lists the known misses.
              </p>
            </div>
          </Section>

          <Section id="rounds">
            <p>
              <b>Amendments aren’t new rounds.</b> Companies often file updates (“Form D/A”) to an earlier notice. Each amendment is
              traced back to its original notice, and the latest amount sold is kept.
            </p>
            <p>
              <b>Filings close together are one round.</b> A company sometimes files a second notice for the same raise, or closes a
              round in tranches. Filings from one company within {merge} days of a round’s first filing are merged into that round.
              For example, Ramp’s 2025 summer raises were reported as two rounds a month apart, and appear here as one.
            </p>
            <p>
              <b>The date</b> is the first sale when the company gives a usable one, otherwise the filing date. It can differ from a
              press announcement by months in either direction.
            </p>
            <p>
              <b>“Stage” means the round’s number in this data</b> (first, second, third or later round seen), not a Series letter.
              A company’s first round here may not be its first raise.
            </p>
          </Section>

          <Section id="odds">
            <p>
              The question is simple: <b>after a round, does the same company file another Form D, and how many months later?</b>{" "}
              The tricky part is recent rounds. A round from last spring hasn’t had two years to be followed yet, so counting it as
              “never raised again” would be unfair.
            </p>
            <p>
              The fix is a standard method from medical statistics called <b>Kaplan–Meier</b>. It counts each round only for the
              months it has actually been watched (up to {longDate(summary.dataset_end_date)}), then combines the months into a
              curve: the share of rounds followed by another filing by month 1, 2, 3 … 36.
            </p>
            <ul className="grid gap-2">
              <li>
                <b>Typical gap</b> is the middle value among rounds that <i>were</i> followed by another filing: about{" "}
                {benchmarks.overall.conditional_median_months.toFixed(1)} months overall.
              </li>
              <li>
                <b>Under {benchmarks.min_gap_months} months isn’t measurable.</b> Because filings within {merge} days merge into one
                round, a second round can’t appear sooner. The site says “not measurable” instead of showing 0%.
              </li>
              <li>
                <b>Small groups aren’t shown.</b> A group needs at least {benchmarks.min_rounds} rounds for an estimate.
              </li>
              <li>
                <b>Size and stage are measured separately.</b> You can compare FinTech by round size, or by stage, but not both at once.
              </li>
            </ul>
            <p>
              <Link href="/explore" className="font-semibold text-brand hover:underline">
                Try it in the explorer →
              </Link>
            </p>
          </Section>

          <Section id="validation">
            <p>
              To see how complete Form D is, the publicly reported rounds of {totals.companies} well-known startups (from press
              coverage and funding trackers) were compared with what the data contains. <b>{totals.matched} of {totals.reported}</b> reported
              rounds appear.
            </p>
            <div className="text-[15px]">
              <div aria-hidden="true" className="hidden grid-cols-[170px_100px_1fr] gap-4 pb-2 text-xs font-semibold uppercase tracking-wider text-muted sm:grid">
                <span>Company</span>
                <span>Found</span>
                <span>Notes</span>
              </div>
              <ul>
                {VALIDATION.map((row) => (
                  <li
                    key={row.company}
                    className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t border-line py-3 sm:grid-cols-[170px_100px_1fr]"
                  >
                    <span>
                      <b>{row.company}</b>
                      <span className="block text-xs text-muted">{row.formDName}</span>
                    </span>
                    <span className="whitespace-nowrap">
                      <span className="font-display font-bold">
                        {row.matched} of {row.reported}
                      </span>
                      <span className="sr-only"> reported rounds found</span>
                      <span aria-hidden="true" className="mt-1 block h-1.5 w-20 rounded-full bg-background">
                        <span className="block h-1.5 rounded-full bg-brand" style={{ width: `${(row.matched / row.reported) * 100}%` }} />
                      </span>
                    </span>
                    <span className="col-span-2 text-muted sm:col-span-1">{row.note}</span>
                  </li>
                ))}
              </ul>
            </div>
            <ul className="grid gap-2">
              <li>
                <b>Some companies file every time; others stop.</b> That matches research finding that most venture-backed rounds have
                no Form D (“Strategic Regulatory Non-Disclosure: The Case of the Missing Form D”, Qianqian Yu). A company that stops
                filing looks like it never raised again, so the rates here understate real fundraising.
              </li>
              <li>
                <b>When a round is filed, the amount is usually within a few percent</b> of what was reported.
              </li>
              <li>
                <b>A company is an SEC ID, not a brand.</b> Many file under a legal name (Instacart is Maplebear Inc.), and a change of
                legal form gives a new ID.
              </li>
              <li>
                <b>These are famous companies that raised often,</b> so their coverage is probably better than average.
              </li>
            </ul>
          </Section>

          <Section id="limits">
            <ul className="grid gap-2">
              <li>
                <b>A lower bound, not a success rate.</b> No later filing can mean a raise that wasn’t filed, an acquisition, an IPO,
                or a shutdown. The data can’t tell these apart.
              </li>
              <li>
                <b>A pattern, not a cause.</b> Companies on their third round are far more likely to file again, but that describes
                who keeps filing; it doesn’t mean a third round causes a fourth.
              </li>
              <li>
                <b>Amounts are self-reported</b> and sometimes wrong, so the site uses counts and medians, never dollar totals.
              </li>
              <li>
                <b>“Startup” is a rule, not a fact.</b> Young, US, venture-type industry, corporation or LLC. Some real startups fail
                the rules and some non-startups pass them.
              </li>
              <li>
                <b>US only</b>, and only companies whose address on the filing is in a US state or DC.
              </li>
            </ul>
          </Section>

          <Section id="calculator">
            <p>
              The <Link href="/analyze" className="font-semibold text-brand hover:underline">screening calculator</Link> applies standard
              first-pass formulas to one startup’s numbers. It doesn’t predict outcomes.
            </p>
            <ul className="grid gap-2 font-mono text-[14px]">
              <li>Runway = cash ÷ (annual burn ÷ 12)</li>
              <li>Ownership = investment ÷ post-money, then reduced by expected future dilution</li>
              <li>Exit value = revenue × (1 + growth)^years × exit multiple</li>
              <li>MOIC = investor’s exit proceeds ÷ investment; IRR = MOIC^(1/years) − 1</li>
            </ul>
            <p>
              Bear and Bull cases adjust growth, the exit multiple and dilution around your inputs. Risk flags use fixed thresholds
              that aren’t sector-specific, growth is compounded at a constant rate (real startups slow down), and the 10 demo
              companies are <b>simulated</b>. The calculator’s Form D card is the one place it uses real data: it looks up how often
              comparable rounds were followed by another filing within the startup’s runway.
            </p>
          </Section>

          <Section id="built">
            <ol className="grid gap-2 sm:grid-cols-5 sm:gap-0">
              {[
                ["SEC data sets", "quarterly Form D zips"],
                ["download.py", "fetches every quarter"],
                ["build_dataset.py", "cleans into rounds"],
                ["analyze.py + summarize.py", "Kaplan–Meier, counts"],
                ["This website", "prebuilt Next.js pages"],
              ].map(([name, what], i, all) => (
                <li key={name} className="flex items-center gap-2 sm:flex-col sm:items-stretch sm:gap-0">
                  <div className="flex-1 rounded-[14px] bg-background p-3 sm:mx-1">
                    <p className="font-mono text-[13px] font-semibold">{name}</p>
                    <p className="text-sm text-muted">{what}</p>
                  </div>
                  {i < all.length - 1 ? (
                    <span aria-hidden="true" className="text-muted sm:hidden">
                      ↓
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
            <p>
              The pipeline is Python (pandas, lifelines). It writes two small JSON files that the website reads when it’s built, so
              every page is prebuilt and loads instantly; no number on the site is typed in by hand. The site is Next.js on Vercel.
              Both halves have automated tests. The code is on{" "}
              <a className="font-semibold text-brand hover:underline" href={REPO}>
                GitHub
              </a>
              .
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
