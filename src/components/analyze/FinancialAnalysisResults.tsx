import type { AnalysisResults } from "@/lib/finance/engine";
import {
  formatCurrency,
  formatMoic,
  formatPercent,
  formatRunwayMonths,
} from "@/lib/finance/format";

const resultRows: {
  label: string;
  value: (results: AnalysisResults) => string;
}[] = [
  {
    label: "Monthly Burn",
    value: (results) => formatCurrency(results.monthlyBurn),
  },
  {
    label: "Runway",
    value: (results) => formatRunwayMonths(results.runwayMonths),
  },
  {
    label: "Post-Money Valuation",
    value: (results) => formatCurrency(results.postMoneyValuation),
  },
  {
    label: "Initial Investor Ownership",
    value: (results) => formatPercent(results.initialInvestorOwnership),
  },
  {
    label: "Diluted Investor Ownership",
    value: (results) => formatPercent(results.dilutedInvestorOwnership),
  },
  {
    label: "Projected Exit Revenue",
    value: (results) => formatCurrency(results.projectedExitRevenue),
  },
  {
    label: "Projected Exit Valuation",
    value: (results) => formatCurrency(results.projectedExitValuation),
  },
  {
    label: "Investor Exit Proceeds",
    value: (results) => formatCurrency(results.investorExitProceeds),
  },
  {
    label: "Modeled MOIC",
    value: (results) => formatMoic(results.moic),
  },
  {
    label: "Modeled IRR",
    value: (results) => formatPercent(results.irr),
  },
];

export function FinancialAnalysisResults({
  companyName,
  results,
}: {
  companyName: string;
  results: AnalysisResults;
}) {
  return (
    <section
      id="financial-analysis-results"
      className="rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
          Results
        </p>
        <h2 className="mt-1 text-base font-semibold text-slate-900">
          Financial Analysis Results
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {companyName
            ? `Deterministic screening outputs for ${companyName}.`
            : "Deterministic screening outputs from the entered inputs."}
        </p>
      </div>
      <dl className="grid gap-px bg-slate-100 sm:grid-cols-2">
        {resultRows.map((row) => (
          <div
            key={row.label}
            className="flex min-w-0 items-baseline justify-between gap-4 bg-white px-5 py-4 sm:px-6"
          >
            <dt className="min-w-0 text-sm text-slate-600">{row.label}</dt>
            <dd className="shrink-0 font-mono text-sm font-medium text-slate-900">
              {row.value(results)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
