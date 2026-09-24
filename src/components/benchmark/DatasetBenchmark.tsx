"use client";

import { useState } from "react";
import { EmptyState } from "@/components/PageChrome";
import { SimulatedBadge } from "@/components/SimulatedBadge";
import { buildDatasetBenchmark } from "@/lib/benchmark/dataset";
import type { SavedCompany } from "@/lib/storage/companies";
import {
  useIsClient,
  useSavedCompanies,
} from "@/lib/storage/useSavedCompanyCount";

const selectClass =
  "h-11 w-full min-w-0 max-w-full appearance-none rounded-md border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-900 outline-none transition-colors focus:border-[#1f8a70] focus:ring-2 focus:ring-[#1f8a70]/15";

function CompanySelect({
  companies,
  value,
  onChange,
}: {
  companies: SavedCompany[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor="benchmark-company"
        className="block text-sm font-medium text-slate-800"
      >
        Company
      </label>
      <div className="relative mt-2">
        <select
          id="benchmark-company"
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

export function DatasetBenchmark() {
  const isClient = useIsClient();
  const companies = useSavedCompanies();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!isClient) {
    return <p className="text-sm text-slate-500">Loading saved companies…</p>;
  }

  if (companies.length < 2) {
    return (
      <EmptyState
        title="Save at least two companies to use Dataset Benchmark"
        description="Analyze and save startups in VentureLens, then return here to compare against the saved-company median."
      />
    );
  }

  const resolvedId =
    selectedId && companies.some((company) => company.id === selectedId)
      ? selectedId
      : companies[0].id;
  const company = companies.find((item) => item.id === resolvedId);

  if (!company) {
    return (
      <EmptyState
        title="Save at least two companies to use Dataset Benchmark"
        description="Analyze and save startups in VentureLens, then return here to compare against the saved-company median."
      />
    );
  }

  const rows = buildDatasetBenchmark(company, companies);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-sm">
          <CompanySelect
            companies={companies}
            value={resolvedId}
            onChange={setSelectedId}
          />
        </div>
        <p className="text-sm text-slate-500">
          Dataset: {companies.length} saved companies
        </p>
      </div>

      <div className="min-w-0 max-w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-5 py-6 sm:px-8">
          <h2 className="flex min-w-0 flex-wrap items-center gap-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            {company.profile.companyName || "Untitled company"}
            <SimulatedBadge company={company} />
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {[company.profile.industry, company.profile.stage]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
        </div>

        <div className="min-w-0 w-full max-w-full overflow-x-auto">
          <table className="min-w-[40rem] w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium sm:px-8">Metric</th>
                <th className="px-5 py-3 font-medium sm:px-8">Selected company</th>
                <th className="px-5 py-3 font-medium sm:px-8">Dataset median</th>
                <th className="px-5 py-3 font-medium sm:px-8">Difference</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 last:border-b-0">
                  <td className="px-5 py-3.5 text-slate-500 sm:px-8">{row.label}</td>
                  <td className="px-5 py-3.5 font-mono font-medium text-slate-900 sm:px-8">
                    {row.selected}
                  </td>
                  <td className="px-5 py-3.5 font-mono font-medium text-slate-900 sm:px-8">
                    {row.median}
                  </td>
                  <td className="px-5 py-3.5 font-mono font-medium text-slate-900 sm:px-8">
                    {row.difference}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-6 text-slate-600 sm:px-6">
        Dataset benchmarks reflect only companies saved in this VentureLens
        workspace and should not be interpreted as market benchmarks.
      </p>
    </div>
  );
}
