"use client";

import { useMemo } from "react";
import type { AnalysisInputs } from "@/lib/finance/engine";
import {
  formatMoic,
  formatPercent,
  formatScenarioCurrency,
} from "@/lib/finance/format";
import {
  calculateScenario,
  parseScenarioDraft,
  type ScenarioDraft,
  type ScenarioId,
} from "@/lib/finance/scenarios";

const scenarioMeta: Record<
  ScenarioId,
  { label: string; accent: string; description: string }
> = {
  bear: {
    label: "Bear Case",
    accent: "border-t-slate-400",
    description: "Conservative growth and exit",
  },
  base: {
    label: "Base Case",
    accent: "border-t-[#1f8a70]",
    description: "Underwriting case",
  },
  bull: {
    label: "Bull Case",
    accent: "border-t-amber-500",
    description: "Upside growth and exit",
  },
};

function AssumptionInput({
  id,
  label,
  suffix,
  value,
  onChange,
}: {
  id: string;
  label: string;
  suffix: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      <span className="mt-1.5 flex h-10 overflow-hidden rounded-md border border-slate-200 bg-white focus-within:border-[#1f8a70] focus-within:ring-2 focus-within:ring-[#1f8a70]/15">
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="decimal"
          className="min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-900 outline-none"
        />
        <span className="flex items-center border-l border-slate-200 bg-slate-50 px-2.5 font-mono text-xs text-slate-500">
          {suffix}
        </span>
      </span>
    </label>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3 py-2">
      <dt className="min-w-0 text-xs text-slate-500">{label}</dt>
      <dd className="shrink-0 font-mono text-sm font-medium text-slate-900">
        {value}
      </dd>
    </div>
  );
}

export function ScenarioAnalysis({
  inputs,
  drafts,
  onDraftsChange,
}: {
  inputs: AnalysisInputs;
  drafts: Record<ScenarioId, ScenarioDraft>;
  onDraftsChange: (drafts: Record<ScenarioId, ScenarioDraft>) => void;
}) {
  const scenarios = useMemo(() => {
    return (Object.keys(scenarioMeta) as ScenarioId[]).map((id) => {
      const parsed = parseScenarioDraft(drafts[id]);
      const outputs = parsed ? calculateScenario(inputs, parsed) : null;

      return { id, outputs };
    });
  }, [drafts, inputs]);

  function updateDraft(
    id: ScenarioId,
    field: keyof ScenarioDraft,
    value: string,
  ) {
    onDraftsChange({
      ...drafts,
      [id]: {
        ...drafts[id],
        [field]: value,
      },
    });
  }

  return (
    <section
      id="scenario-analysis"
      className="rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
          Scenarios
        </p>
        <h2 className="mt-1 text-base font-semibold text-slate-900">
          Scenario Analysis
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Compare investor returns under Bear, Base, and Bull assumptions.
          Edit an assumption to recalculate that case.
        </p>
      </div>

      <div className="grid gap-px bg-slate-100 xl:grid-cols-3">
        {scenarios.map(({ id, outputs }) => {
          const meta = scenarioMeta[id];
          const draft = drafts[id];

          return (
            <article
              key={id}
              className={`border-t-4 bg-white px-5 py-5 sm:px-6 ${meta.accent}`}
            >
              <h3 className="text-sm font-semibold text-slate-900">
                {meta.label}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">{meta.description}</p>

              <div className="mt-4 grid gap-3">
                <AssumptionInput
                  id={`${id}-revenue-growth`}
                  label="Revenue Growth"
                  suffix="%"
                  value={draft.revenueGrowth}
                  onChange={(value) => updateDraft(id, "revenueGrowth", value)}
                />
                <AssumptionInput
                  id={`${id}-exit-multiple`}
                  label="Exit Revenue Multiple"
                  suffix="x"
                  value={draft.exitRevenueMultiple}
                  onChange={(value) =>
                    updateDraft(id, "exitRevenueMultiple", value)
                  }
                />
                <AssumptionInput
                  id={`${id}-future-dilution`}
                  label="Future Dilution"
                  suffix="%"
                  value={draft.futureDilution}
                  onChange={(value) => updateDraft(id, "futureDilution", value)}
                />
              </div>

              <dl className="mt-5 divide-y divide-slate-100 border-t border-slate-100">
                <ResultRow
                  label="Projected Exit Revenue"
                  value={
                    outputs
                      ? formatScenarioCurrency(outputs.projectedExitRevenue)
                      : "—"
                  }
                />
                <ResultRow
                  label="Projected Exit Valuation"
                  value={
                    outputs
                      ? formatScenarioCurrency(outputs.projectedExitValuation)
                      : "—"
                  }
                />
                <ResultRow
                  label="Diluted Investor Ownership"
                  value={
                    outputs
                      ? formatPercent(outputs.dilutedInvestorOwnership)
                      : "—"
                  }
                />
                <ResultRow
                  label="Investor Exit Proceeds"
                  value={
                    outputs
                      ? formatScenarioCurrency(outputs.investorExitProceeds)
                      : "—"
                  }
                />
                <ResultRow
                  label="Modeled MOIC"
                  value={outputs ? formatMoic(outputs.moic) : "—"}
                />
                <ResultRow
                  label="Modeled IRR"
                  value={outputs ? formatPercent(outputs.irr) : "—"}
                />
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}
