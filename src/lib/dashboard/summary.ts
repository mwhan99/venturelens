import type { SavedCompany } from "@/lib/storage/companies";

function mean(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function dashboardSummary(companies: SavedCompany[]) {
  return {
    count: companies.length,
    averageRevenueGrowth: mean(
      companies.map((company) => company.financialInputs.revenueGrowth),
    ),
    averageRunwayMonths: mean(
      companies.map((company) => company.calculatedMetrics.runwayMonths),
    ),
    averageMoic: mean(
      companies.map((company) => company.calculatedMetrics.moic),
    ),
  };
}

export function sortSavedCompaniesByRecent(companies: SavedCompany[]) {
  return [...companies].sort((left, right) => {
    const leftTime = Date.parse(left.dateAnalyzed);
    const rightTime = Date.parse(right.dateAnalyzed);
    const safeLeft = Number.isNaN(leftTime) ? 0 : leftTime;
    const safeRight = Number.isNaN(rightTime) ? 0 : rightTime;
    return safeRight - safeLeft;
  });
}
