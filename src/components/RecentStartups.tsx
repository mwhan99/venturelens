"use client";

import Link from "next/link";
import { SimulatedBadge } from "@/components/SimulatedBadge";
import { sortSavedCompaniesByRecent } from "@/lib/dashboard/summary";
import {
  formatCompactPercent,
  formatMoic,
  formatRunwayMonths,
} from "@/lib/finance/format";
import { formatAnalyzedDate } from "@/lib/storage/companies";
import {
  useIsClient,
  useSavedCompanies,
} from "@/lib/storage/useSavedCompanyCount";

export function RecentStartups() {
  const isClient = useIsClient();
  const companies = useSavedCompanies();
  const recent = sortSavedCompaniesByRecent(companies);

  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">Recent Startups</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Latest screening activity in this workspace
        </p>
      </div>

      {!isClient ? (
        <p className="px-5 py-8 text-sm text-slate-500">Loading saved companies…</p>
      ) : recent.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="text-sm font-medium text-slate-800">
            No companies analyzed yet.
          </p>
          <Link
            href="/analyze"
            className="mt-5 inline-flex h-10 items-center rounded-md bg-[#1f8a70] px-4 text-sm font-medium text-white hover:bg-[#18735d]"
          >
            Analyze Startup
          </Link>
        </div>
      ) : (
        <div className="min-w-0 w-full max-w-full overflow-x-auto">
          <table className="min-w-[48rem] w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">Industry</th>
                <th className="px-5 py-3 font-medium">Stage</th>
                <th className="px-5 py-3 font-medium">Rev. growth</th>
                <th className="px-5 py-3 font-medium">Runway</th>
                <th className="px-5 py-3 font-medium">Modeled MOIC</th>
                <th className="px-5 py-3 font-medium">Date analyzed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent.map((company) => (
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
                    {formatMoic(company.calculatedMetrics.moic)}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {formatAnalyzedDate(company.dateAnalyzed)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
