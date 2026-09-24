import {
  formatCompactPercent,
  formatCurrency,
  formatMoic,
  formatPercent,
  formatRunwayMonths,
} from "@/lib/finance/format";
import type { SavedCompany } from "@/lib/storage/companies";

export type BenchmarkMetricId =
  | "revenueGrowth"
  | "grossMargin"
  | "runway"
  | "preMoneyValuation"
  | "moic"
  | "irr"
  | "customerConcentration";

export type BenchmarkMetric = {
  id: BenchmarkMetricId;
  label: string;
  selected: string;
  median: string;
  difference: string;
};

function median(values: number[]): number | null {
  const sorted = values
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  if (sorted.length === 0) {
    return null;
  }

  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function signed(value: number, formatted: string) {
  if (!Number.isFinite(value) || value <= 0 || formatted.startsWith("-")) {
    return formatted;
  }

  return `+${formatted}`;
}

function extractMetric(
  company: SavedCompany,
  id: BenchmarkMetricId,
): number | null {
  switch (id) {
    case "revenueGrowth":
      return company.financialInputs.revenueGrowth;
    case "grossMargin":
      return company.financialInputs.grossMargin;
    case "runway":
      return company.calculatedMetrics.runwayMonths;
    case "preMoneyValuation":
      return company.financialInputs.preMoneyValuation;
    case "moic":
      return company.calculatedMetrics.moic;
    case "irr":
      return company.calculatedMetrics.irr;
    case "customerConcentration":
      return company.businessRiskData.largestCustomerRevenue;
  }
}

const metricFormatters: Record<
  BenchmarkMetricId,
  {
    label: string;
    format: (value: number) => string;
  }
> = {
  revenueGrowth: {
    label: "Revenue Growth",
    format: formatCompactPercent,
  },
  grossMargin: {
    label: "Gross Margin",
    format: formatCompactPercent,
  },
  runway: {
    label: "Runway",
    format: formatRunwayMonths,
  },
  preMoneyValuation: {
    label: "Pre-Money Valuation",
    format: formatCurrency,
  },
  moic: {
    label: "Modeled MOIC",
    format: formatMoic,
  },
  irr: {
    label: "Modeled IRR",
    format: formatPercent,
  },
  customerConcentration: {
    label: "Customer Concentration",
    format: formatCompactPercent,
  },
};

const metricOrder: BenchmarkMetricId[] = [
  "revenueGrowth",
  "grossMargin",
  "runway",
  "preMoneyValuation",
  "moic",
  "irr",
  "customerConcentration",
];

export function buildDatasetBenchmark(
  company: SavedCompany,
  companies: SavedCompany[],
): BenchmarkMetric[] {
  return metricOrder.map((id) => {
    const { label, format } = metricFormatters[id];
    const selectedValue = extractMetric(company, id);
    const medianValue = median(
      companies
        .map((item) => extractMetric(item, id))
        .filter((value): value is number => value !== null),
    );

    const differenceValue =
      selectedValue === null || medianValue === null
        ? null
        : selectedValue - medianValue;

    return {
      id,
      label,
      selected: selectedValue === null ? "—" : format(selectedValue),
      median: medianValue === null ? "—" : format(medianValue),
      difference:
        differenceValue === null ? "—" : signed(differenceValue, format(differenceValue)),
    };
  });
}
