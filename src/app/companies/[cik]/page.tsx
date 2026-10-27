import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/lookup/StatusBadge";
import { count, money } from "@/lib/formd/summary";
import {
  STATUS_LABEL,
  edgarUrl,
  explorerHrefForSector,
  getFiler,
  getNames,
  getRounds,
  parseCik,
  type Round,
} from "@/lib/lookup";

// Company pages are built the first time someone opens them, then kept for an hour.
export const revalidate = 3600;

function date(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function gap(months: number | null): string {
  if (months === null) return "—";
  return months >= 24 ? `${(months / 12).toFixed(1)} years` : `${months.toFixed(1)} months`;
}

function amount(round: Round): ReactNode {
  if (!round.amount_sold) return <span className="text-muted">nothing sold yet</span>;
  return money(round.amount_sold);
}

export async function generateMetadata({ params }: PageProps<"/companies/[cik]">): Promise<Metadata> {
  const cik = parseCik((await params).cik);
  const filer = cik ? await getFiler(cik) : null;
  if (!filer) return { title: "Company not found" };
  return {
    title: filer.name,
    description: `${filer.name}: ${filer.round_count} funding ${filer.round_count === 1 ? "round" : "rounds"} from SEC Form D filings. ${STATUS_LABEL[filer.benchmark_status].short}.`,
  };
}

export default async function CompanyPage({ params }: PageProps<"/companies/[cik]">) {
  const cik = parseCik((await params).cik);
  if (!cik) notFound();
  const [filer, rounds, names] = await Promise.all([getFiler(cik), getRounds(cik), getNames(cik)]);
  if (!filer) notFound();

  const otherNames = names.filter((n) => n.name !== filer.name);
  const explorerHref = filer.benchmark_status === "benchmark" ? explorerHrefForSector(filer.venture_sector) : null;
  const label = STATUS_LABEL[filer.benchmark_status];
  const biggest = Math.max(0, ...rounds.map((r) => r.amount_sold ?? 0));

  return (
    <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6">
      <p className="mb-3 text-sm">
        <Link href="/companies" className="font-semibold text-brand hover:underline">
          ← Look up another company
        </Link>
      </p>

      <div className="grid gap-4 md:grid-cols-[1.5fr_1fr] md:gap-5">
        <section className="min-w-0 rounded-[18px] border border-line bg-card p-6 sm:rounded-[22px] sm:p-8">
          <span className="inline-block rounded-full bg-lime px-2.5 py-1 text-[13px] font-bold">SEC ID {cik}</span>
          <h1 className="mt-4 break-words font-display text-[clamp(28px,3.8vw,44px)] font-bold leading-[1.06] tracking-[-0.035em]">
            {filer.name}
          </h1>
          <p className="mt-2 text-[15px] text-muted">{[filer.state, filer.industry].filter(Boolean).join(" · ")}</p>
          {otherNames.length ? (
            <p className="mt-3 text-[15px]">
              <span className="text-muted">Also known as </span>
              {otherNames.map((n, i) => (
                <span key={n.name}>
                  {i ? ", " : ""}
                  <b className="font-semibold">{n.name}</b>
                  {n.source === "brand" ? <span className="text-muted"> (brand)</span> : null}
                </span>
              ))}
            </p>
          ) : null}
        </section>

        <section
          className={`flex min-w-0 flex-col justify-between gap-4 rounded-[18px] p-6 sm:rounded-[22px] sm:p-8 ${
            label.counted ? "bg-brand text-white" : "border border-line bg-card"
          }`}
        >
          <div>
            <p className={`text-sm ${label.counted ? "opacity-80" : "text-muted"}`}>In the benchmark?</p>
            <p className="mt-2 font-display text-3xl font-bold tracking-[-0.03em]">{label.counted ? "Yes" : "No"}</p>
            <p className="mt-2 text-[15px] leading-snug">
              {label.counted ? `Counted as ${filer.venture_sector}.` : label.long}
              {filer.status_detail ? <span className="block mt-1 opacity-90">{filer.status_detail}</span> : null}
            </p>
          </div>
          {explorerHref ? (
            <Link href={explorerHref} className="self-start rounded-full bg-lime px-4 py-2 text-sm font-bold text-ink hover:bg-white">
              See the odds for {filer.venture_sector} →
            </Link>
          ) : (
            <span className="self-start">
              <StatusBadge status={filer.benchmark_status} />
            </span>
          )}
        </section>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:mt-5 md:grid-cols-4 md:gap-5">
        {[
          { value: count(filer.round_count), label: filer.round_count === 1 ? "round reported" : "rounds reported" },
          { value: count(filer.completed_round_count), label: "with money sold" },
          { value: date(filer.first_event_date), label: "first round here" },
          { value: date(filer.last_event_date), label: "latest round here" },
        ].map((stat) => (
          <div key={stat.label} className="min-w-0 rounded-[18px] border border-line bg-card p-5">
            <p className="font-display text-[22px] font-bold leading-tight tracking-[-0.02em] sm:text-[26px]">{stat.value}</p>
            <p className="mt-1 text-sm text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <section className="mt-4 min-w-0 rounded-[18px] border border-line bg-card p-6 sm:mt-5 sm:rounded-[22px] sm:p-7">
        <h2 className="font-display text-2xl font-bold tracking-[-0.03em]">Funding rounds</h2>
        <p className="mb-4 mt-1 text-[15px] text-muted">
          From its Form D filings. Filings within 90 days are merged into one round; amounts are as reported.
        </p>
        <div className="hidden grid-cols-[60px_130px_1fr_110px_120px] gap-3 border-b border-line pb-2 text-xs font-semibold uppercase tracking-wider text-muted md:grid">
          <span>Round</span>
          <span>Date</span>
          <span>Amount sold</span>
          <span>Investors</span>
          <span>Since previous</span>
        </div>
        <ol>
          {rounds.map((round) => (
            <li
              key={round.round_number}
              className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-b border-line py-3 text-[15px] last:border-0 md:grid-cols-[60px_130px_1fr_110px_120px] md:items-center"
            >
              <span className="font-display font-bold text-brand">#{round.round_number}</span>
              <span>
                {date(round.event_date)}
                {round.event_date_source === "FILING_DATE" ? <span className="block text-xs text-muted">filing date</span> : null}
              </span>
              <span className="col-span-2 flex items-center gap-3 md:col-span-1">
                <span className="min-w-[92px] font-semibold">{amount(round)}</span>
                {biggest > 0 && round.amount_sold ? (
                  <span aria-hidden="true" className="hidden h-2 flex-1 rounded-full bg-background sm:block">
                    <span className="block h-2 rounded-full bg-brand" style={{ width: `${Math.max(2, (round.amount_sold / biggest) * 100)}%` }} />
                  </span>
                ) : null}
              </span>
              <span className="text-muted md:text-ink">
                <span className="md:hidden">Investors: </span>
                {round.investor_count ?? "—"}
              </span>
              <span className="text-muted md:text-ink">
                <span className="md:hidden">Since previous: </span>
                {gap(round.months_since_previous)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-4 min-w-0 rounded-[18px] bg-brand-soft p-6 sm:mt-5 sm:rounded-[22px] sm:p-8">
        <h2 className="font-display text-2xl font-bold tracking-[-0.03em]">Reading this page</h2>
        <ul className="mt-3 grid gap-2 text-[15px] md:grid-cols-2 md:gap-x-8">
          <li>
            <b>Not every raise is here.</b> SAFEs, notes and many priced rounds never get a Form D, so a company can have raised
            more than it shows.
          </li>
          <li>
            <b>Round numbers count rounds in this data</b> (from 2008), not Series letters.
          </li>
          <li>
            <b>One company, one SEC ID.</b> A change of legal form (say, LLC to corporation) gives a new ID, so a company can
            appear twice.
          </li>
          <li>
            <b>Amounts are self-reported</b> and occasionally wrong.
          </li>
        </ul>
        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
          <a className="text-brand hover:underline" href={edgarUrl(cik)} target="_blank" rel="noreferrer">
            See its filings on SEC EDGAR ↗
          </a>
          <Link className="text-brand hover:underline" href="/methodology#funnel">
            How companies are sorted →
          </Link>
        </p>
      </section>
    </div>
  );
}
