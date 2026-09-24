"use client";

import { useState } from "react";
import { EmptyState } from "@/components/PageChrome";
import { SimulatedBadge } from "@/components/SimulatedBadge";
import { buildComparisonInsights } from "@/lib/compare/insights";
import {
  formatCompactPercent,
  formatCurrency,
  formatMoic,
  formatPercent,
  formatRunwayMonths,
} from "@/lib/finance/format";
import type { SavedCompany } from "@/lib/storage/companies";
import {
  useIsClient,
  useSavedCompanies,
} from "@/lib/storage/useSavedCompanyCount";

const selectClass =
  "h-11 w-full min-w-0 max-w-full appearance-none rounded-md border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-900 outline-none transition-colors focus:border-[#1f8a70] focus:ring-2 focus:ring-[#1f8a70]/15";

function optionalNumber(
  value: number | null,
  format: (value: number) => string,
) {
  return value === null ? "—" : format(value);
}

type MetricRow = {
  label: string;
  left: string;
  right: string;
};

type MetricSection = {
  title: string;
  rows: MetricRow[];
};

function CompanySelect({
  id,
  label,
  value,
  companies,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  companies: SavedCompany[];
  onChange: (id: string) => void;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      <div className="relative mt-2">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={selectClass}
        >
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.profile.companyName || "Untitled company"}
              {company.source === "Simulated" ? " (Simulated)" : ""}
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
  );
}

function buildSections(left: SavedCompany, right: SavedCompany): MetricSection[] {
  return [
    {
      title: "Business Profile",
      rows: [
        {
          label: "Current Revenue",
          left: formatCurrency(left.financialInputs.currentRevenue),
          right: formatCurrency(right.financialInputs.currentRevenue),
        },
        {
          label: "Revenue Growth",
          left: formatCompactPercent(left.financialInputs.revenueGrowth),
          right: formatCompactPercent(right.financialInputs.revenueGrowth),
        },
        {
          label: "Gross Margin",
          left: optionalNumber(left.financialInputs.grossMargin, formatCompactPercent),
          right: optionalNumber(
            right.financialInputs.grossMargin,
            formatCompactPercent,
          ),
        },
        {
          label: "Runway",
          left: formatRunwayMonths(left.calculatedMetrics.runwayMonths),
          right: formatRunwayMonths(right.calculatedMetrics.runwayMonths),
        },
      ],
    },
    {
      title: "Investment Terms",
      rows: [
        {
          label: "Pre-Money Valuation",
          left: formatCurrency(left.financialInputs.preMoneyValuation),
          right: formatCurrency(right.financialInputs.preMoneyValuation),
        },
        {
          label: "Investment Amount",
          left: formatCurrency(left.financialInputs.investmentAmount),
          right: formatCurrency(right.financialInputs.investmentAmount),
        },
        {
          label: "Initial Investor Ownership",
          left: formatPercent(left.calculatedMetrics.initialInvestorOwnership),
          right: formatPercent(right.calculatedMetrics.initialInvestorOwnership),
        },
        {
          label: "Diluted Investor Ownership",
          left: formatPercent(left.calculatedMetrics.dilutedInvestorOwnership),
          right: formatPercent(right.calculatedMetrics.dilutedInvestorOwnership),
        },
      ],
    },
    {
      title: "Modeled Returns",
      rows: [
        {
          label: "Projected Exit Valuation",
          left: formatCurrency(left.calculatedMetrics.projectedExitValuation),
          right: formatCurrency(right.calculatedMetrics.projectedExitValuation),
        },
        {
          label: "Modeled MOIC",
          left: formatMoic(left.calculatedMetrics.moic),
          right: formatMoic(right.calculatedMetrics.moic),
        },
        {
          label: "Modeled IRR",
          left: formatPercent(left.calculatedMetrics.irr),
          right: formatPercent(right.calculatedMetrics.irr),
        },
      ],
    },
    {
      title: "Risk",
      rows: [
        {
          label: "Largest Customer Revenue",
          left: optionalNumber(
            left.businessRiskData.largestCustomerRevenue,
            formatCompactPercent,
          ),
          right: optionalNumber(
            right.businessRiskData.largestCustomerRevenue,
            formatCompactPercent,
          ),
        },
      ],
    },
  ];
}

export function CompareStartups() {
  const isClient = useIsClient();
  const companies = useSavedCompanies();
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);

  if (!isClient) {
    return <p className="text-sm text-slate-500">Loading saved companies…</p>;
  }

  if (companies.length < 2) {
    return (
      <EmptyState
        title="Save at least two companies to compare"
        description="Analyze and save startups in VentureLens, then return here for a side-by-side review."
      />
    );
  }

  const selectedLeftId =
    leftId && companies.some((company) => company.id === leftId)
      ? leftId
      : companies[0].id;
  const selectedRightId =
    rightId &&
    companies.some((company) => company.id === rightId) &&
    rightId !== selectedLeftId
      ? rightId
      : (companies.find((company) => company.id !== selectedLeftId)?.id ??
        companies[0].id);

  const left = companies.find((company) => company.id === selectedLeftId);
  const right = companies.find((company) => company.id === selectedRightId);

  if (!left || !right || left.id === right.id) {
    return (
      <EmptyState
        title="Save at least two companies to compare"
        description="Analyze and save startups in VentureLens, then return here for a side-by-side review."
      />
    );
  }

  function handleLeftChange(id: string) {
    if (id === selectedRightId) {
      setRightId(selectedLeftId);
    }
    setLeftId(id);
  }

  function handleRightChange(id: string) {
    if (id === selectedLeftId) {
      setLeftId(selectedRightId);
    }
    setRightId(id);
  }

  const sections = buildSections(left, right);
  const insights = buildComparisonInsights(left, right);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <CompanySelect
          id="company-1"
          label="Company 1"
          value={selectedLeftId}
          companies={companies}
          onChange={handleLeftChange}
        />
        <CompanySelect
          id="company-2"
          label="Company 2"
          value={selectedRightId}
          companies={companies}
          onChange={handleRightChange}
        />
      </div>

      <div className="min-w-0 w-full max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="min-w-[40rem]">
        <div className="grid grid-cols-[minmax(8.5rem,1.15fr)_1fr_1fr] gap-4 border-b border-slate-100 px-5 py-6 sm:px-8 sm:py-7">
          <div className="hidden sm:block" />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
              Company 1
            </p>
            <h2 className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              {left.profile.companyName || "Untitled company"}
              <SimulatedBadge company={left} />
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {[left.profile.industry, left.profile.stage]
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
              Company 2
            </p>
            <h2 className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              {right.profile.companyName || "Untitled company"}
              <SimulatedBadge company={right} />
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {[right.profile.industry, right.profile.stage]
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
          </div>
        </div>

        {sections.map((section) => (
          <section key={section.title} className="border-b border-slate-100 last:border-b-0">
            <h3 className="px-5 pb-1 pt-6 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400 sm:px-8">
              {section.title}
            </h3>
            <div>
              {section.rows.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[minmax(8.5rem,1.15fr)_1fr_1fr] gap-4 px-5 py-3.5 sm:px-8"
                >
                  <div className="text-sm text-slate-500">{row.label}</div>
                  <div className="font-mono text-sm font-medium text-slate-900">
                    {row.left}
                  </div>
                  <div className="font-mono text-sm font-medium text-slate-900">
                    {row.right}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white px-5 py-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-8 sm:py-7">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">
          Comparison Insights
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Factual differences from the saved screening metrics.
        </p>
        <dl className="mt-6 space-y-5">
          {insights.map((insight) => (
            <div key={insight.label}>
              <dt className="text-sm font-medium text-slate-900">{insight.label}</dt>
              <dd className="mt-1 text-sm leading-6 text-slate-600">{insight.text}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
