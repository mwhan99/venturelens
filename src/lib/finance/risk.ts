import type { AnalysisInputs, AnalysisResults } from "@/lib/finance/engine";
import {
  formatCompactPercent,
  formatPercentagePoints,
  formatRunwayMonths,
} from "@/lib/finance/format";

export type RiskTone = "positive" | "neutral" | "caution";

export type RiskFlag = {
  id: string;
  metric: string;
  value: string;
  status: string;
  explanation: string;
  tone: RiskTone;
};

export type RiskInputs = {
  analysisInputs: AnalysisInputs;
  analysisResults: AnalysisResults;
  grossMargin: number | null;
  largestCustomerRevenue: number | null;
  bearIrr: number | null;
  bullIrr: number | null;
};

function assessRevenueGrowth(revenueGrowth: number): RiskFlag {
  let status: string;
  let explanation: string;
  let tone: RiskTone;

  if (revenueGrowth >= 0.5) {
    status = "Strong";
    explanation = "Strong revenue growth indicates rapid business expansion.";
    tone = "positive";
  } else if (revenueGrowth >= 0.2) {
    status = "Moderate";
    explanation = "Revenue is growing at a moderate pace.";
    tone = "neutral";
  } else {
    status = "Weak";
    explanation = "Low revenue growth may indicate limited business momentum.";
    tone = "caution";
  }

  return {
    id: "revenue-growth",
    metric: "Revenue Growth",
    value: formatCompactPercent(revenueGrowth),
    status,
    explanation,
    tone,
  };
}

function assessRunway(runwayMonths: number): RiskFlag {
  let status: string;
  let explanation: string;
  let tone: RiskTone;

  if (runwayMonths >= 18) {
    status = "Healthy";
    explanation = "Cash runway provides sufficient operating flexibility.";
    tone = "positive";
  } else if (runwayMonths >= 12) {
    status = "Moderate";
    explanation =
      "Cash runway is adequate but may require additional funding within 12–18 months.";
    tone = "neutral";
  } else {
    status = "High Risk";
    explanation = "Short cash runway creates near-term financing risk.";
    tone = "caution";
  }

  return {
    id: "runway",
    metric: "Runway",
    value: formatRunwayMonths(runwayMonths),
    status,
    explanation,
    tone,
  };
}

function assessGrossMargin(grossMargin: number | null): RiskFlag | null {
  if (grossMargin === null) {
    return null;
  }

  let status: string;
  let explanation: string;
  let tone: RiskTone;

  if (grossMargin >= 0.7) {
    status = "Strong";
    explanation = "High gross margin indicates attractive unit economics.";
    tone = "positive";
  } else if (grossMargin >= 0.5) {
    status = "Moderate";
    explanation = "Gross margin is reasonable but has room for improvement.";
    tone = "neutral";
  } else {
    status = "Low";
    explanation = "Low gross margin may limit scalability and profitability.";
    tone = "caution";
  }

  return {
    id: "gross-margin",
    metric: "Gross Margin",
    value: formatCompactPercent(grossMargin),
    status,
    explanation,
    tone,
  };
}

function assessCustomerConcentration(
  largestCustomerRevenue: number | null,
): RiskFlag | null {
  if (largestCustomerRevenue === null) {
    return null;
  }

  let status: string;
  let explanation: string;
  let tone: RiskTone;

  if (largestCustomerRevenue >= 0.3) {
    status = "High Risk";
    explanation =
      "High dependence on the largest customer creates concentration risk.";
    tone = "caution";
  } else if (largestCustomerRevenue >= 0.15) {
    status = "Moderate Risk";
    explanation =
      "Customer concentration should be monitored as the company scales.";
    tone = "neutral";
  } else {
    status = "Low Risk";
    explanation = "Revenue is relatively diversified across customers.";
    tone = "positive";
  }

  return {
    id: "customer-concentration",
    metric: "Customer Concentration",
    value: formatCompactPercent(largestCustomerRevenue),
    status,
    explanation,
    tone,
  };
}

function assessScenarioSensitivity(
  bearIrr: number | null,
  bullIrr: number | null,
): RiskFlag | null {
  if (bearIrr === null || bullIrr === null) {
    return null;
  }

  const sensitivityPoints = (bullIrr - bearIrr) * 100;
  let status: string;
  let explanation: string;
  let tone: RiskTone;

  if (sensitivityPoints >= 50) {
    status = "High Sensitivity";
    explanation =
      "Returns vary significantly across scenarios and depend heavily on growth and exit assumptions.";
    tone = "caution";
  } else if (sensitivityPoints >= 25) {
    status = "Moderate Sensitivity";
    explanation =
      "Returns show moderate sensitivity to changes in key assumptions.";
    tone = "neutral";
  } else {
    status = "Low Sensitivity";
    explanation = "Returns remain relatively stable across scenarios.";
    tone = "positive";
  }

  return {
    id: "scenario-sensitivity",
    metric: "Scenario Sensitivity",
    value: `${formatPercentagePoints(sensitivityPoints)} percentage points`,
    status,
    explanation,
    tone,
  };
}

export function assessRiskFlags(input: RiskInputs): RiskFlag[] {
  return [
    assessRevenueGrowth(input.analysisInputs.revenueGrowth),
    assessRunway(input.analysisResults.runwayMonths),
    assessGrossMargin(input.grossMargin),
    assessCustomerConcentration(input.largestCustomerRevenue),
    assessScenarioSensitivity(input.bearIrr, input.bullIrr),
  ].filter((flag): flag is RiskFlag => flag !== null);
}
