import {
  RISK_TAG_LABELS,
  type HistoricalCase,
} from "@/data/historical-cases";
import { badgeBaseClass } from "@/components/PageChrome";
import { matchHistoricalCases } from "@/lib/cases/match";
import type { SavedCompany } from "@/lib/storage/companies";

function SourceLink({ historicalCase }: { historicalCase: HistoricalCase }) {
  if (historicalCase.sourceUrl) {
    return (
      <a
        href={historicalCase.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-medium text-[#1f8a70] hover:text-[#18735d] hover:underline"
      >
        {historicalCase.sourceLabel}
      </a>
    );
  }

  return (
    <span className="text-sm text-slate-700">{historicalCase.sourceLabel}</span>
  );
}

export function HistoricalCaseIntelligence({
  company,
}: {
  company: SavedCompany;
}) {
  const { matches } = matchHistoricalCases(company);

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
          Historical cases
        </p>
        <h2 className="mt-1 text-base font-semibold text-slate-900">
          Historical Case Intelligence
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Historical cases that share selected risk patterns. Similarity does
          not imply the same outcome.
        </p>
      </div>

      {matches.length === 0 ? (
        <p className="px-5 py-8 text-sm leading-6 text-slate-600 sm:px-6">
          No strong historical case match was identified from the current
          prototype library.
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {matches.map((match) => (
            <article key={match.case.id} className="space-y-4 px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {match.case.companyName}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {match.case.primaryRiskPattern}
                  </p>
                </div>
                <p className="text-xs font-medium text-slate-500 sm:text-right">
                  Matched on {match.matchedDimensionCount} risk dimensions
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {match.matchedTags.map((tag) => (
                  <span
                    key={tag}
                    className={`${badgeBaseClass} border border-slate-200 bg-slate-50 text-slate-700`}
                  >
                    {RISK_TAG_LABELS[tag]}
                  </span>
                ))}
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Summary
                </h4>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  {match.case.summary}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Similarities
                  </h4>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-6 text-slate-700">
                    {match.similarities.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Differences
                  </h4>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-6 text-slate-700">
                    {match.differences.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Due Diligence questions
                </h4>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-6 text-slate-700">
                  {match.case.diligenceQuestions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </div>

              <p className="text-sm text-slate-600">
                Source: <SourceLink historicalCase={match.case} />
              </p>
            </article>
          ))}
        </div>
      )}

      <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">
            Search More Cases with AI
          </p>
          <span className={`${badgeBaseClass} bg-slate-200 text-slate-700`}>
            Coming Soon
          </span>
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Future versions of VentureLens are designed to retrieve additional
          sourced historical cases dynamically.
        </p>
      </div>
    </section>
  );
}
