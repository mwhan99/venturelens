"use client";

import { useMemo, useState } from "react";
import { EmptyState, badgeBaseClass } from "@/components/PageChrome";
import { RISK_TAG_LABELS } from "@/data/historical-cases";
import { buildInvestmentMemo } from "@/lib/memo/buildMemo";
import { formatAnalyzedDate, type SavedCompany } from "@/lib/storage/companies";
import {
  useIsClient,
  useSavedCompanies,
} from "@/lib/storage/useSavedCompanyCount";

const selectClass =
  "h-11 w-full min-w-0 max-w-full appearance-none rounded-md border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-900 outline-none transition-colors focus:border-[#1f8a70] focus:ring-2 focus:ring-[#1f8a70]/15";

function SourceBadge({ company }: { company: SavedCompany }) {
  if (!company.source) {
    return null;
  }

  const styles =
    company.source === "Simulated"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : company.source === "Public Data"
        ? "border-sky-200 bg-sky-50 text-sky-800"
        : "border-violet-200 bg-violet-50 text-violet-800";

  return (
    <span
      className={`${badgeBaseClass} border ${styles}`}
    >
      {company.source}
    </span>
  );
}

function MemoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0">
      <dt className="min-w-0 text-sm text-slate-600">{label}</dt>
      <dd className="shrink-0 font-mono text-sm font-medium text-slate-900">
        {value}
      </dd>
    </div>
  );
}

export function InvestmentMemoPage() {
  const isClient = useIsClient();
  const companies = useSavedCompanies();
  const [selectedId, setSelectedId] = useState("");

  const company =
    companies.find((item) => item.id === selectedId) ?? companies[0] ?? null;

  const memo = useMemo(() => {
    if (!company) {
      return null;
    }
    return buildInvestmentMemo(company, companies);
  }, [company, companies]);

  if (!isClient) {
    return <p className="text-sm text-slate-500">Loading investment memo…</p>;
  }

  if (companies.length === 0) {
    return (
      <EmptyState
        title="No saved companies to memo"
        description="Analyze a startup and save it to VentureLens before generating an investment memo. The memo synthesizes stored screening outputs only."
      />
    );
  }

  if (!company || !memo) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 print:hidden sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="memo-company"
            className="block text-sm font-medium text-slate-800"
          >
            Saved company
          </label>
          <div className="relative mt-2 max-w-md">
            <select
              id="memo-company"
              value={company.id}
              onChange={(event) => setSelectedId(event.target.value)}
              className={selectClass}
            >
              {companies.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.profile.companyName || "Untitled company"}
                  {item.source === "Simulated" ? " (Simulated)" : ""}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
              <svg viewBox="0 0 12 8" className="h-3 w-3" aria-hidden="true">
                <path
                  d="M1 1.5 6 6.5 11 1.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-11 w-full shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900 sm:w-auto"
        >
          Print / Save as PDF
        </button>
      </div>

      <article className="investment-memo overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] print:overflow-visible print:border-0 print:shadow-none print:rounded-none">
        <header className="border-b border-slate-200 px-5 py-8 sm:px-10 print:px-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
            Investment screening memo
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              {company.profile.companyName || "Untitled company"}
            </h2>
            <SourceBadge company={company} />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Prepared from saved VentureLens outputs · Analyzed{" "}
            {formatAnalyzedDate(company.dateAnalyzed)}
          </p>
        </header>

        <div className="space-y-10 px-5 py-8 sm:px-10 print:px-0">
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-900">
              Executive Summary
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {memo.executiveSummary}
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-900">
              1. Company Overview
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {memo.overview.narrative}
            </p>
            <dl className="mt-4">
              {memo.overview.metrics.map((row) => (
                <MemoRow key={row.label} label={row.label} value={row.value} />
              ))}
            </dl>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-900">
              2. Financial Profile
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {memo.financial.narrative}
            </p>
            <dl className="mt-4">
              {memo.financial.metrics.map((row) => (
                <MemoRow key={row.label} label={row.label} value={row.value} />
              ))}
            </dl>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              {memo.financial.datasetContext}
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-900">
              3. Investment Terms
            </h3>
            <dl className="mt-4">
              {memo.terms.metrics.map((row) => (
                <MemoRow key={row.label} label={row.label} value={row.value} />
              ))}
            </dl>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-900">
              4. Modeled Return Profile
            </h3>
            <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
              {memo.returns.disclaimer}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {memo.returns.narrative}
            </p>
            <dl className="mt-4">
              {memo.returns.metrics.map((row) => (
                <MemoRow key={row.label} label={row.label} value={row.value} />
              ))}
            </dl>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-900">
              5. Scenario Analysis
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {memo.scenarios.narrative}
            </p>
            <div className="mt-4 min-w-0 max-w-full overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Scenario</th>
                    <th className="py-2 pr-4 font-medium">Exit Valuation</th>
                    <th className="py-2 pr-4 font-medium">Modeled MOIC</th>
                    <th className="py-2 font-medium">Modeled IRR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {memo.scenarios.rows.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2.5 pr-4 font-medium text-slate-800">
                        {row.label}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-slate-900">
                        {row.exitValuation}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-slate-900">
                        {row.moic}
                      </td>
                      <td className="py-2.5 font-mono text-slate-900">
                        {row.irr}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-900">
              6. Key Risks & Historical Context
            </h3>
            <div className="mt-4 divide-y divide-slate-100">
              {memo.risks.flags.map((flag) => (
                <div key={flag.id} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">
                      {flag.metric}
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        {flag.status}
                      </span>
                    </p>
                    <p className="font-mono text-sm text-slate-900">
                      {flag.value}
                    </p>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {flag.explanation}
                  </p>
                </div>
              ))}
            </div>

            {memo.risks.matches.length === 0 ? (
              <p className="mt-4 text-sm leading-6 text-slate-600">
                {memo.risks.emptyMatchCopy}
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {memo.risks.matches.map((match) => (
                  <li
                    key={match.case.id}
                    className="rounded-md border border-slate-200 px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {match.case.companyName}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {match.case.primaryRiskPattern}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Matched on {match.matchedDimensionCount} risk dimensions
                      ({match.matchedTags.map((tag) => RISK_TAG_LABELS[tag]).join(", ")})
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-sm leading-6 text-slate-500">
              {memo.risks.historicalDisclaimer}
            </p>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-900">
              7. Due Diligence Priorities
            </h3>
            {memo.diligenceQuestions.length === 0 ? (
              <p className="mt-3 text-sm leading-7 text-slate-600">
                No additional quantitative risk tags were generated from the
                current outputs, so no tag-based diligence questions are listed.
              </p>
            ) : (
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-slate-700">
                {memo.diligenceQuestions.map((item) => (
                  <li key={item.id}>{item.question}</li>
                ))}
              </ol>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-900">
              8. Analyst Takeaways
            </h3>
            <dl className="mt-4 space-y-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Strongest quantitative signals
                </dt>
                <dd className="mt-1 text-sm leading-7 text-slate-700">
                  {memo.takeaways.strongestSignals}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Primary identified risks
                </dt>
                <dd className="mt-1 text-sm leading-7 text-slate-700">
                  {memo.takeaways.primaryRisks}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Major scenario dependency
                </dt>
                <dd className="mt-1 text-sm leading-7 text-slate-700">
                  {memo.takeaways.scenarioDependency}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Areas requiring further diligence
                </dt>
                <dd className="mt-1 text-sm leading-7 text-slate-700">
                  {memo.takeaways.furtherDiligence}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <footer className="border-t border-slate-200 bg-slate-50 px-5 py-5 sm:px-10 print:bg-white print:px-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">AI Analyst</p>
            <span className={`${badgeBaseClass} bg-slate-200 text-slate-700`}>
              Coming Soon
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Future versions of VentureLens are designed to use AI to synthesize
            structured analysis, sourced research, and diligence findings while
            keeping financial calculations deterministic.
          </p>
        </footer>
      </article>
    </div>
  );
}
