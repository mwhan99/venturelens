import {
  formatCompactPercent,
  formatMoic,
  formatPercent,
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

function formatHorizon(years: number) {
  const rounded = Math.round(years * 10) / 10;
  const label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${label} ${rounded === 1 ? "year" : "years"}`;
}

function returnInsight(left: SavedCompany, right: SavedCompany): ComparisonInsight {
  const leftMoic = left.calculatedMetrics.moic;
  const rightMoic = right.calculatedMetrics.moic;
  const leftIrr = left.calculatedMetrics.irr;
  const rightIrr = right.calculatedMetrics.irr;
  const leftName = named(left);
  const rightName = named(right);
  const moicSame = leftMoic === rightMoic;
  const irrSame = leftIrr === rightIrr;

  if (moicSame && irrSame) {
    return {
      label: "Return Profile",
      text: `${leftName} and ${rightName} have the same modeled MOIC (${formatMoic(leftMoic)}) and the same modeled IRR (${formatPercent(leftIrr)}).`,
    };
  }

  const moicLeader = leftMoic > rightMoic ? left : rightMoic > leftMoic ? right : null;
  const irrLeader = leftIrr > rightIrr ? left : rightIrr > leftIrr ? right : null;
  const moicTrailer = moicLeader === left ? right : left;
  const irrTrailer = irrLeader === left ? right : left;

  if (moicLeader && irrLeader && moicLeader.id !== irrLeader.id) {
    const longerHorizon =
      moicLeader.financialInputs.investmentHorizon >
      irrLeader.financialInputs.investmentHorizon;
    const horizonNote = longerHorizon
      ? ` That split fits a longer horizon at ${named(moicLeader)} (${formatHorizon(moicLeader.financialInputs.investmentHorizon)} vs ${formatHorizon(irrLeader.financialInputs.investmentHorizon)}).`
      : " The two metrics point in different directions.";

    return {
      label: "Return Profile",
      text: `${named(moicLeader)} has the higher modeled MOIC (${formatMoic(moicLeader.calculatedMetrics.moic)} vs ${formatMoic(moicTrailer.calculatedMetrics.moic)}), but ${named(irrLeader)} has the higher modeled IRR (${formatPercent(irrLeader.calculatedMetrics.irr)} vs ${formatPercent(irrTrailer.calculatedMetrics.irr)}).${horizonNote}`,
    };
  }

  if (moicSame && irrLeader) {
    return {
      label: "Return Profile",
      text: `${leftName} and ${rightName} have the same modeled MOIC (${formatMoic(leftMoic)}). ${named(irrLeader)} has the higher modeled IRR (${formatPercent(irrLeader.calculatedMetrics.irr)} vs ${formatPercent(irrTrailer.calculatedMetrics.irr)}).`,
    };
  }

  if (irrSame && moicLeader) {
    return {
      label: "Return Profile",
      text: `${named(moicLeader)} has the higher modeled MOIC (${formatMoic(moicLeader.calculatedMetrics.moic)} vs ${formatMoic(moicTrailer.calculatedMetrics.moic)}). Both have the same modeled IRR (${formatPercent(leftIrr)}).`,
    };
  }

  const leader = moicLeader ?? irrLeader ?? left;
  const other = leader === left ? right : left;

  return {
    label: "Return Profile",
    text: `${named(leader)} has the higher modeled MOIC (${formatMoic(leader.calculatedMetrics.moic)} vs ${formatMoic(other.calculatedMetrics.moic)}) and the higher modeled IRR (${formatPercent(leader.calculatedMetrics.irr)} vs ${formatPercent(other.calculatedMetrics.irr)}).`,
  };
}

function riskEdge(company: SavedCompany, other: SavedCompany) {
  let score = 0;

  if (company.calculatedMetrics.runwayMonths > other.calculatedMetrics.runwayMonths) {
    score += 1;
  } else if (company.calculatedMetrics.runwayMonths < other.calculatedMetrics.runwayMonths) {
    score -= 1;
  }

  const margin = company.financialInputs.grossMargin;
  const otherMargin = other.financialInputs.grossMargin;
  if (margin !== null && otherMargin !== null) {
    if (margin > otherMargin) {
      score += 1;
    } else if (margin < otherMargin) {
      score -= 1;
    }
  }

  const concentration = company.businessRiskData.largestCustomerRevenue;
  const otherConcentration = other.businessRiskData.largestCustomerRevenue;
  if (concentration !== null && otherConcentration !== null) {
    if (concentration < otherConcentration) {
      score += 1;
    } else if (concentration > otherConcentration) {
      score -= 1;
    }
  }

  return score;
}

function overallTradeoff(left: SavedCompany, right: SavedCompany): ComparisonInsight {
  const leftName = named(left);
  const rightName = named(right);
  const growthLeader =
    left.financialInputs.revenueGrowth > right.financialInputs.revenueGrowth
      ? left
      : right.financialInputs.revenueGrowth > left.financialInputs.revenueGrowth
        ? right
        : null;
  const leftRisk = riskEdge(left, right);
  const riskLeader = leftRisk > 0 ? left : leftRisk < 0 ? right : null;

  let text: string;
  if (growthLeader && riskLeader && growthLeader.id === riskLeader.id) {
    text = `${named(growthLeader)} has both the stronger growth case and the lower-risk profile.`;
  } else if (growthLeader && riskLeader) {
    text = `${named(growthLeader)} has the stronger growth case, while ${named(riskLeader)} has the lower-risk profile.`;
  } else if (growthLeader) {
    text = `${named(growthLeader)} has the stronger growth case, while margin, runway, and customer concentration do not give either company a clearly lower-risk profile.`;
  } else if (riskLeader) {
    text = `${named(riskLeader)} has the lower-risk profile, while revenue growth is similar.`;
  } else {
    text = `${leftName} and ${rightName} look similar on growth, margin, runway, and customer concentration.`;
  }

  return { label: "Overall trade-off", text };
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
    overallTradeoff(left, right),
  ];
}
