import {
  formatCompactPercent,
  formatMoic,
  formatRunwayMonths,
} from "@/lib/finance/format";
import type { SavedCompany } from "@/lib/storage/companies";

export type ComparisonInsight = {
  label: string;
  text: string;
};

function formatPoints(value: number) {
  const abs = Math.abs(value);
  if (Math.abs(abs - Math.round(abs)) < 1e-9) {
    return `${Math.round(abs)}`;
  }

  return abs.toFixed(2);
}

function formatMonthDelta(value: number) {
  const abs = Math.abs(value);
  if (Math.abs(abs - Math.round(abs)) < 1e-9) {
    return `${Math.round(abs)} months`;
  }

  return `${abs.toFixed(2)} months`;
}

function named(company: SavedCompany) {
  return company.profile.companyName || "Untitled company";
}

function growthInsight(left: SavedCompany, right: SavedCompany): ComparisonInsight {
  const leftGrowth = left.financialInputs.revenueGrowth;
  const rightGrowth = right.financialInputs.revenueGrowth;
  const leftName = named(left);
  const rightName = named(right);
  const leftLabel = formatCompactPercent(leftGrowth);

  if (leftGrowth === rightGrowth) {
    return {
      label: "Growth",
      text: `${leftName} and ${rightName} have the same revenue growth (${leftLabel}).`,
    };
  }

  const higher = leftGrowth > rightGrowth ? left : right;
  const lower = leftGrowth > rightGrowth ? right : left;
  const difference = Math.abs(leftGrowth - rightGrowth) * 100;

  return {
    label: "Growth",
    text: `${named(higher)} has higher revenue growth than ${named(lower)} (${formatCompactPercent(higher.financialInputs.revenueGrowth)} vs ${formatCompactPercent(lower.financialInputs.revenueGrowth)}), a difference of ${formatPoints(difference)} percentage points.`,
  };
}

function marginInsight(left: SavedCompany, right: SavedCompany): ComparisonInsight {
  const leftMargin = left.financialInputs.grossMargin;
  const rightMargin = right.financialInputs.grossMargin;
  const leftName = named(left);
  const rightName = named(right);

  if (leftMargin === null && rightMargin === null) {
    return {
      label: "Gross Margin",
      text: "Gross margin is not available for either company.",
    };
  }

  if (leftMargin === null || rightMargin === null) {
    const available = leftMargin === null ? right : left;
    const missing = leftMargin === null ? left : right;
    return {
      label: "Gross Margin",
      text: `Gross margin is available for ${named(available)} (${formatCompactPercent(available.financialInputs.grossMargin as number)}) and is not available for ${named(missing)}.`,
    };
  }

  if (leftMargin === rightMargin) {
    return {
      label: "Gross Margin",
      text: `${leftName} and ${rightName} have the same gross margin (${formatCompactPercent(leftMargin)}).`,
    };
  }

  const higher = leftMargin > rightMargin ? left : right;
  const lower = leftMargin > rightMargin ? right : left;
  const difference = Math.abs(leftMargin - rightMargin) * 100;

  return {
    label: "Gross Margin",
    text: `${named(higher)} has higher gross margin than ${named(lower)} (${formatCompactPercent(higher.financialInputs.grossMargin as number)} vs ${formatCompactPercent(lower.financialInputs.grossMargin as number)}), a difference of ${formatPoints(difference)} percentage points.`,
  };
}

function runwayInsight(left: SavedCompany, right: SavedCompany): ComparisonInsight {
  const leftRunway = left.calculatedMetrics.runwayMonths;
  const rightRunway = right.calculatedMetrics.runwayMonths;
  const leftName = named(left);
  const rightName = named(right);

  if (leftRunway === rightRunway) {
    return {
      label: "Runway",
      text: `${leftName} and ${rightName} have the same runway (${formatRunwayMonths(leftRunway)}).`,
    };
  }

  const higher = leftRunway > rightRunway ? left : right;
  const lower = leftRunway > rightRunway ? right : left;

  return {
    label: "Runway",
    text: `${named(higher)} has more runway than ${named(lower)} (${formatRunwayMonths(higher.calculatedMetrics.runwayMonths)} vs ${formatRunwayMonths(lower.calculatedMetrics.runwayMonths)}), a difference of ${formatMonthDelta(Math.abs(leftRunway - rightRunway))}.`,
  };
}

function returnInsight(left: SavedCompany, right: SavedCompany): ComparisonInsight {
  const leftMoic = left.calculatedMetrics.moic;
  const rightMoic = right.calculatedMetrics.moic;
  const leftName = named(left);
  const rightName = named(right);

  if (leftMoic === rightMoic) {
    return {
      label: "Return Profile",
      text: `${leftName} and ${rightName} have the same modeled MOIC (${formatMoic(leftMoic)}).`,
    };
  }

  const higher = leftMoic > rightMoic ? left : right;
  const lower = leftMoic > rightMoic ? right : left;

  return {
    label: "Return Profile",
    text: `${named(higher)} has the higher modeled MOIC (${formatMoic(higher.calculatedMetrics.moic)} vs ${formatMoic(lower.calculatedMetrics.moic)}).`,
  };
}

function concentrationInsight(
  left: SavedCompany,
  right: SavedCompany,
): ComparisonInsight {
  const leftConcentration = left.businessRiskData.largestCustomerRevenue;
  const rightConcentration = right.businessRiskData.largestCustomerRevenue;
  const leftName = named(left);
  const rightName = named(right);

  if (leftConcentration === null && rightConcentration === null) {
    return {
      label: "Customer Concentration",
      text: "Largest-customer revenue share is not available for either company.",
    };
  }

  if (leftConcentration === null || rightConcentration === null) {
    const available = leftConcentration === null ? right : left;
    const missing = leftConcentration === null ? left : right;
    return {
      label: "Customer Concentration",
      text: `Largest-customer revenue share is available for ${named(available)} (${formatCompactPercent(available.businessRiskData.largestCustomerRevenue as number)}) and is not available for ${named(missing)}.`,
    };
  }

  if (leftConcentration === rightConcentration) {
    return {
      label: "Customer Concentration",
      text: `${leftName} and ${rightName} have the same customer concentration (${formatCompactPercent(leftConcentration)}).`,
    };
  }

  const lower = leftConcentration < rightConcentration ? left : right;
  const higher = leftConcentration < rightConcentration ? right : left;

  return {
    label: "Customer Concentration",
    text: `${named(lower)} has lower customer concentration (${formatCompactPercent(lower.businessRiskData.largestCustomerRevenue as number)} vs ${formatCompactPercent(higher.businessRiskData.largestCustomerRevenue as number)}).`,
  };
}

export function buildComparisonInsights(
  left: SavedCompany,
  right: SavedCompany,
): ComparisonInsight[] {
  return [
    growthInsight(left, right),
    marginInsight(left, right),
    runwayInsight(left, right),
    returnInsight(left, right),
    concentrationInsight(left, right),
  ];
}
