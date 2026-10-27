import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { StatusBadge } from "@/components/lookup/StatusBadge";
import summary from "@/data/formd/summary.json";
import { count } from "@/lib/formd/summary";
import { MAX_QUERY_LENGTH, STATUS_LABEL, parseQuery, searchFilers, type BenchmarkStatus } from "@/lib/lookup";

export const metadata: Metadata = {
  title: "Company lookup",
  description:
    "Search any company that filed an SEC Form D: its funding rounds, and whether it's counted in the VentureLens startup benchmark.",
};

const EXAMPLES = ["Figma", "Instacart", "Ramp", "Databricks", "Stripe", "Warby Parker"];
const usFilers = summary.funnel.find((step) => step.step === "US")?.companies ?? 0;

export default async function CompaniesPage({ searchParams }: PageProps<"/companies">) {
  const query = parseQuery((await searchParams).q);
  const hits = query ? await searchFilers(query) : [];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6">
      <section className="min-w-0 rounded-[18px] border border-line bg-card p-6 sm:rounded-[22px] sm:p-9">
        <span className="inline-block rounded-full bg-lime px-2.5 py-1 text-[13px] font-bold">
          {count(usFilers)} companies · SEC Form D
        </span>
        <h1 className="mt-4 font-display text-[clamp(32px,4.4vw,52px)] font-bold leading-[1.04] tracking-[-0.04em]">
          Look up a company
        </h1>
        <p className="mt-3 max-w-[40em] text-lg text-muted">
          Search any US company that filed a Form D: see every funding round it reported, and whether it’s counted in the
          startup benchmark, and if not, why.
        </p>
        <Form action="/companies" className="mt-6 flex max-w-2xl flex-col gap-2.5 sm:flex-row" role="search">
          <label htmlFor="q" className="sr-only">
            Company name
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            maxLength={MAX_QUERY_LENGTH}
            placeholder="e.g. Figma, Instacart, Ramp…"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-full border-2 border-line bg-card px-5 py-3 text-[16px] outline-none transition-colors focus:border-brand"
          />
          <button type="submit" className="rounded-full bg-brand px-6 py-3 font-bold text-white transition-colors hover:bg-brand-dark">
            Search
          </button>
        </Form>
        {!query ? (
          <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
            Try:
            {EXAMPLES.map((name) => (
              <Link
                key={name}
                href={`/companies?q=${encodeURIComponent(name)}`}
                className="rounded-full bg-background px-3 py-1.5 font-semibold text-ink transition-colors hover:bg-brand-soft"
              >
                {name}
              </Link>
            ))}
          </p>
        ) : null}
      </section>

      {query ? (
        <section className="mt-4 min-w-0 rounded-[18px] border border-line bg-card p-6 sm:mt-5 sm:rounded-[22px] sm:p-7" aria-live="polite">
          <h2 className="font-display text-2xl font-bold tracking-[-0.03em]">
            {query.length < 2
              ? "Type at least two letters"
              : hits.length
                ? `${hits.length === 20 ? "Top 20" : hits.length} ${hits.length === 1 ? "match" : "matches"} for “${query}”`
                : `No companies match “${query}”`}
          </h2>
          {query.length >= 2 && !hits.length ? (
            <p className="mt-2 text-[15px] text-muted">
              Try a shorter name, or the company’s legal name. Many companies never file a Form D, so not every startup is here.
            </p>
          ) : null}
          {hits.length ? (
            <ul className="mt-4 grid gap-2">
              {hits.map((hit) => (
                <li key={hit.cik}>
                  <Link
                    href={`/companies/${hit.cik}`}
                    className="flex flex-col gap-2 rounded-[14px] bg-background px-4 py-3 transition-colors hover:bg-brand-soft sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">{hit.name}</span>
                      <span className="block text-sm text-muted">
                        {hit.matched_name.toLowerCase() !== hit.name.toLowerCase() ? <>Found as “{hit.matched_name}” · </> : null}
                        {[hit.state, hit.industry].filter(Boolean).join(" · ")} · {hit.round_count}{" "}
                        {hit.round_count === 1 ? "round" : "rounds"}
                      </span>
                    </span>
                    <span className="shrink-0">
                      <StatusBadge status={hit.benchmark_status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : (
        <section className="mt-4 min-w-0 rounded-[18px] bg-brand-soft p-6 sm:mt-5 sm:rounded-[22px] sm:p-8">
          <h2 className="font-display text-2xl font-bold tracking-[-0.03em]">What the labels mean</h2>
          <ul className="mt-3 grid gap-3 text-[15px] md:grid-cols-2 md:gap-x-8">
            {(Object.keys(STATUS_LABEL) as BenchmarkStatus[]).map((status) => (
              <li key={status} className="flex flex-col items-start gap-1">
                <StatusBadge status={status} />
                <span className="text-muted">{STATUS_LABEL[status].long}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            <Link href="/methodology#funnel" className="font-semibold text-brand hover:underline">
              How companies are sorted →
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
