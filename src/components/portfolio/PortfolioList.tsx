"use client";

import Link from "next/link";
import { useState } from "react";
import { SimulatedBadge } from "@/components/SimulatedBadge";
import {
  formatCompactPercent,
  formatCurrency,
  formatMoic,
  formatPercent,
  formatRunwayMonths,
} from "@/lib/finance/format";
import {
  deleteSavedCompany,
  formatAnalyzedDate,
  type SavedCompany,
} from "@/lib/storage/companies";
import {
  useIsClient,
  useSavedCompanies,
} from "@/lib/storage/useSavedCompanyCount";
import { EmptyState } from "@/components/PageChrome";

export function PortfolioList() {
  const isClient = useIsClient();
  const companies = useSavedCompanies();
  const [pendingDelete, setPendingDelete] = useState<SavedCompany | null>(null);

  if (!isClient) {
    return <p className="text-sm text-slate-500">Loading portfolio…</p>;
  }

  function confirmDelete() {
    if (!pendingDelete) {
      return;
    }

    deleteSavedCompany(pendingDelete.id);
    setPendingDelete(null);
  }

  if (companies.length === 0) {
    return (
      <EmptyState
        title="No saved companies"
        description="Analyze a startup, then save it to VentureLens to build this portfolio."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="min-w-0 max-w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="min-w-0 w-full max-w-full overflow-x-auto">
          <table className="min-w-[56rem] w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">Industry</th>
                <th className="px-5 py-3 font-medium">Stage</th>
                <th className="px-5 py-3 font-medium">Rev. growth</th>
                <th className="px-5 py-3 font-medium">Runway</th>
                <th className="px-5 py-3 font-medium">Pre-Money Valuation</th>
                <th className="px-5 py-3 font-medium">Modeled MOIC</th>
                <th className="px-5 py-3 font-medium">Modeled IRR</th>
                <th className="px-5 py-3 font-medium">Concentration</th>
                <th className="px-5 py-3 font-medium">Date analyzed</th>
                <th className="px-5 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/portfolio/${company.id}`}
                        className="font-medium text-slate-900 hover:text-[#1f8a70]"
                      >
                        {company.profile.companyName || "Untitled company"}
                      </Link>
                      <SimulatedBadge company={company} />
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {company.profile.industry || "—"}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {company.profile.stage || "—"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-mono text-slate-700">
                    {formatCompactPercent(company.financialInputs.revenueGrowth)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-mono text-slate-700">
                    {formatRunwayMonths(company.calculatedMetrics.runwayMonths)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-mono text-slate-700">
                    {formatCurrency(company.financialInputs.preMoneyValuation)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-mono text-slate-700">
                    {formatMoic(company.calculatedMetrics.moic)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-mono text-slate-700">
                    {formatPercent(company.calculatedMetrics.irr)}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-slate-700">
                    {company.businessRiskData.largestCustomerRevenue === null
                      ? "—"
                      : formatCompactPercent(
                          company.businessRiskData.largestCustomerRevenue,
                        )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {formatAnalyzedDate(company.dateAnalyzed)}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => setPendingDelete(company)}
                      className="text-sm text-slate-500 hover:text-rose-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pendingDelete ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-medium text-rose-950">
            Delete {pendingDelete.profile.companyName}?
          </p>
          <p className="mt-1 text-sm text-rose-900">
            This removes the saved record from this browser only.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={confirmDelete}
              className="inline-flex h-9 items-center rounded-md bg-rose-700 px-3 text-sm font-medium text-white hover:bg-rose-800"
            >
              Delete company
            </button>
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
