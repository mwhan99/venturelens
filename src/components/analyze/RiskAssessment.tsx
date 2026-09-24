import { badgeBaseClass } from "@/components/PageChrome";
import type { RiskFlag } from "@/lib/finance/risk";

const badgeStyles: Record<RiskFlag["tone"], string> = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-800",
  neutral: "border-amber-200 bg-amber-50 text-amber-800",
  caution: "border-rose-200 bg-rose-50 text-rose-800",
};

export function RiskAssessment({ flags }: { flags: RiskFlag[] }) {
  return (
    <section
      id="risk-assessment"
      className="rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
          Risk
        </p>
        <h2 className="mt-1 text-base font-semibold text-slate-900">
          Risk Assessment
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Deterministic operating and scenario indicators from the current
          screening inputs.
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {flags.map((flag) => (
          <article
            key={flag.id}
            className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:px-6"
          >
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h3 className="text-sm font-semibold text-slate-900">
                  {flag.metric}
                </h3>
                <span
                  className={`${badgeBaseClass} border ${badgeStyles[flag.tone]}`}
                >
                  {flag.status}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {flag.explanation}
              </p>
            </div>
            <p className="font-mono text-sm font-medium text-slate-900 sm:text-right">
              {flag.value}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
