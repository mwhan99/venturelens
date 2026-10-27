import type { Metadata } from "next";
import { Suspense } from "react";
import { Explorer, ExplorerFallback } from "@/components/explore/Explorer";
import { DATASET_END, MIN_GAP_MONTHS, getSegments } from "@/lib/formd/explorer";
import { count, longDate } from "@/lib/formd/summary";
import benchmarks from "@/data/formd/benchmarks.json";

export const metadata: Metadata = {
  title: "Fundraising odds explorer",
  description:
    "How likely is a US startup's funding round to be followed by another SEC Form D filing, and how soon? Pick a sector, round size or stage.",
};

const REPO = "https://github.com/mwhan99/venturelens";

export default function ExplorePage() {
  const segments = getSegments();
  const props = { segments, minGap: MIN_GAP_MONTHS };
  return (
    <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6">
      <section className="mb-4 min-w-0 rounded-[18px] border border-line bg-card p-6 sm:mb-5 sm:rounded-[22px] sm:p-9">
        <span className="inline-block rounded-full bg-lime px-2.5 py-1 text-[13px] font-bold">
          {count(benchmarks.counts.rounds)} rounds · through {longDate(DATASET_END)}
        </span>
        <h1 className="mt-4 font-display text-[clamp(32px,4.4vw,52px)] font-bold leading-[1.04] tracking-[-0.04em]">
          Fundraising odds explorer
        </h1>
        <p className="mt-3 max-w-[40em] text-lg text-muted">
          After a startup raises a round, how likely is it to file for another one, and how soon? Pick a sector, then a round
          size or a stage, and compare it with all startups.
        </p>
      </section>

      <Suspense fallback={<ExplorerFallback {...props} />}>
        <Explorer {...props} />
      </Suspense>

      <section className="mt-4 min-w-0 rounded-[18px] bg-brand-soft p-6 sm:mt-5 sm:rounded-[22px] sm:p-8">
        <h2 className="font-display text-2xl font-bold tracking-[-0.03em]">Reading these numbers</h2>
        <ul className="mt-3 grid gap-2 text-[15px] md:grid-cols-2 md:gap-x-8">
          <li>
            <b>A lower bound.</b> Many raises never appear on Form D (SAFEs, convertible notes, and companies that simply
            don’t file), so the real share that raised again is higher.
          </li>
          <li>
            <b>Not measurable under {MIN_GAP_MONTHS} months.</b> Filings within 90 days are merged into one round, so a quick
            follow-on can’t be told apart from the same round.
          </li>
          <li>
            <b>Fair to recent rounds.</b> The rates are Kaplan–Meier estimates: a round from last year counts only for the
            months it has actually been watched.
          </li>
          <li>
            <b>“Stage” is the round’s number in this data</b>, not its Series letter. A company’s first round seen here may not
            be its first raise.
          </li>
        </ul>
        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
          <a className="text-brand hover:underline" href={`${REPO}/blob/main/pipeline/FINDINGS.md`}>
            Full findings →
          </a>
          <a className="text-brand hover:underline" href={`${REPO}/blob/main/pipeline/DECISIONS.md`}>
            How the data is cleaned →
          </a>
        </p>
      </section>
    </div>
  );
}
