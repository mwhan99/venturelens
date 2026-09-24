"use client";

import { MetricCard } from "@/components/MetricCard";
import { dashboardSummary } from "@/lib/dashboard/summary";
import {
  formatCompactPercent,
  formatMoic,
  formatRunwayMonths,
} from "@/lib/finance/format";
import {
  useIsClient,
  useSavedCompanies,
} from "@/lib/storage/useSavedCompanyCount";

export function DashboardSummaryCards() {
  const isClient = useIsClient();
  const companies = useSavedCompanies();
  const summary = dashboardSummary(isClient ? companies : []);

  return (
    <>
      <MetricCard
        label="Companies Screened"
        value={isClient ? String(summary.count) : "—"}
        detail="Currently saved in VentureLens"
        tone="neutral"
      />
      <MetricCard
        label="Average Revenue Growth"
        value={
          summary.averageRevenueGrowth === null
            ? "—"
            : formatCompactPercent(summary.averageRevenueGrowth)
        }
        detail="Mean of saved screening inputs"
        tone="neutral"
      />
      <MetricCard
        label="Average Runway"
        value={
          summary.averageRunwayMonths === null
            ? "—"
            : formatRunwayMonths(summary.averageRunwayMonths)
        }
        detail="Mean modeled cash runway"
        tone="neutral"
      />
      <MetricCard
        label="Average Modeled MOIC"
        value={
          summary.averageMoic === null ? "—" : formatMoic(summary.averageMoic)
        }
        detail="Average modeled return multiple"
        tone="neutral"
      />
    </>
  );
}
