import Link from "next/link";
import type { ReactNode } from "react";
import { OddsCurve, SectorBars, YearBars } from "@/components/charts/Charts";
import { OddsPicker } from "@/components/home/OddsPicker";
import { count, findings, getHomeData, getOddsTable, longDate, money, pct } from "@/lib/formd/summary";

const REPO = "https://github.com/mwhan99/venturelens";

function Card({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`min-w-0 rounded-[18px] border border-line bg-card p-6 sm:rounded-[22px] sm:p-7 ${className}`}>
      {children}
    </section>
  );
}

function CardTitle({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <>
      <h2 className="font-display text-2xl font-bold tracking-[-0.03em]">{title}</h2>
      {sub ? <p className="mb-4 mt-1 text-[15px] text-muted">{sub}</p> : null}
    </>
  );
}

export default function HomePage() {
  const data = getHomeData();
  const peak = data.years.filter((y) => !y.partial).reduce((a, y) => (y.rounds > a.rounds ? y : a));
  const partial = data.years.find((y) => y.partial);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6">
      <div className="grid gap-4 md:grid-cols-[1.15fr_1fr] md:gap-5">
        <Card className="sm:p-9">
          <span className="inline-block rounded-full bg-lime px-2.5 py-1 text-[13px] font-bold">
            SEC Form D · {data.firstYear}–{data.lastYear}
          </span>
          <h1 className="mt-4 font-display text-[clamp(34px,4.8vw,56px)] font-bold leading-[1.02] tracking-[-0.04em]">
            How often do startups raise again?
          </h1>
          <p className="mt-4 max-w-[32em] text-lg text-muted">
            We followed <b className="text-ink">{count(data.rounds)}</b> funding rounds by{" "}
            <b className="text-ink">{count(data.companies)}</b> US startups through public SEC filings,
            to see who came back for more money, and when.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <a href="#odds" className="rounded-full bg-brand px-5 py-3 font-bold text-white transition-colors hover:bg-brand-dark">
              See the odds
            </a>
            <Link href="/analyze" className="rounded-full bg-brand-soft px-5 py-3 font-bold text-brand transition-colors hover:bg-[#ddd5ff]">
              Screen a startup
            </Link>
          </div>
        </Card>
        <section className="flex min-w-0 flex-col justify-between gap-6 rounded-[18px] bg-brand p-6 text-white sm:rounded-[22px] sm:p-9">
          <p className="text-sm opacity-80">Within 24 months</p>
          <div>
            <p className="font-display text-[clamp(72px,10vw,128px)] font-bold leading-[0.9] tracking-[-0.05em]">
              {pct(data.overall.p24)}
            </p>
            <p className="mt-4 max-w-[20em] text-lg leading-snug">
              of rounds were followed by another Form D filing. That’s a lower bound: plenty of raises
              never get filed.
            </p>
          </div>
        </section>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:mt-5 md:grid-cols-4 md:gap-5">
        {[
          { value: `${data.overall.gap.toFixed(1)} mo`, label: "typical gap when a startup did file again" },
          { value: money(data.medianRound), label: "median round size" },
          { value: String(peak.year), label: `peak year, ${count(peak.rounds)} rounds` },
          { value: count(data.filers), label: "Form D filers checked" },
        ].map((stat) => (
          <Card key={stat.label} className="p-5! sm:p-6!">
            <p className="font-display text-[28px] font-bold leading-tight tracking-[-0.03em] sm:text-[34px]">{stat.value}</p>
            <p className="mt-1 text-sm text-muted">{stat.label}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:mt-5 md:grid-cols-[1.5fr_1fr] md:gap-5">
        <Card id="odds" className="scroll-mt-6">
          <CardTitle title="The odds of raising again" sub="Share of rounds followed by another Form D filing, by months since the round." />
          <div className="mb-2 flex gap-4 text-sm font-semibold">
            <span><i className="mr-1.5 inline-block h-1 w-4 rounded-sm bg-brand align-middle" />Technology</span>
            <span><i className="mr-1.5 inline-block h-1 w-4 rounded-sm bg-coral align-middle" />All startups</span>
          </div>
          <OddsCurve technology={data.technologyCurve} overall={data.overall.curve} minGap={data.minGap} />
        </Card>
        <section className="min-w-0 rounded-[18px] bg-ink p-6 text-white sm:rounded-[22px] sm:p-7">
          <h2 className="font-display text-2xl font-bold tracking-[-0.03em]">Try it</h2>
          <p className="mb-5 mt-1 text-[15px] text-[#b9b7c4]">Pick a sector and round size.</p>
          <OddsPicker table={getOddsTable()} />
        </section>
      </div>

      <div className="mt-4 grid gap-4 md:mt-5 md:grid-cols-[1fr_1.5fr] md:gap-5">
        <Card>
          <CardTitle title="Key findings" sub="Written from the data, so they update with it." />
          <ul className="grid gap-4">
            {findings(data).map((f) => (
              <li key={f.text} className="flex gap-4">
                <span className="min-w-[76px] shrink-0 font-display text-[22px] font-bold leading-none tracking-[-0.02em] text-coral">
                  {f.figure}
                </span>
                <span className="text-[15px]">{f.text}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardTitle
            title="Rounds per year"
            sub={
              <>
                Startup fundraising peaked in {peak.year}.
                {partial ? ` ${partial.year} (striped) runs only through ${longDate(data.endDate).split(" ")[0]}.` : ""}
              </>
            }
          />
          <YearBars data={data.years} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:mt-5 md:grid-cols-[1.5fr_1fr] md:gap-5">
        <Card>
          <CardTitle title="By sector" sub="Filed again within 24 months. Hover a bar for the typical gap." />
          <SectorBars data={data.sectors} />
        </Card>
        <Card>
          <CardTitle
            title="From filings to startups"
            sub={`${count(data.filers)} Form D filers, cleaned down to the venture-backed startups.`}
          />
          <ol className="grid gap-1">
            {data.funnel.map((f, i) => (
              <li
                key={f.step}
                className={`flex justify-between rounded-[10px] px-3 py-2 text-[15px] ${
                  i === data.funnel.length - 1 ? "bg-brand-soft font-semibold text-brand" : i % 2 === 0 ? "bg-background" : ""
                }`}
              >
                <span>{f.step}</span>
                <b className="font-display">{count(f.companies)}</b>
              </li>
            ))}
          </ol>
          <a className="mt-4 inline-block text-sm font-semibold text-brand hover:underline" href={`${REPO}/blob/main/pipeline/DECISIONS.md`}>
            How each step works →
          </a>
        </Card>
      </div>

      <section className="mt-4 flex flex-col items-start justify-between gap-5 rounded-[18px] bg-brand-soft p-6 sm:rounded-[22px] sm:p-8 md:mt-5 md:flex-row md:items-center">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-bold tracking-[-0.03em]">Have a startup in mind?</h2>
          <p className="mt-1 text-[15px] text-muted">
            Run its runway, ownership, MOIC and IRR in one form, get Bear, Base and Bull cases and risk flags,
            and see how its runway compares with these benchmarks.
          </p>
        </div>
        <Link href="/analyze" className="shrink-0 rounded-full bg-ink px-5 py-3 font-bold text-white transition-colors hover:bg-brand">
          Screen a startup →
        </Link>
      </section>
    </div>
  );
}
