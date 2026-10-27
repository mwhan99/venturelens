import { describe, expect, it } from "vitest";
import { calculateFinancialAnalysis } from "@/lib/finance/engine";
import {
  formatCurrency,
  formatMoic,
  formatPercent,
  formatRunwayMonths,
} from "@/lib/finance/format";
import { parsePercentInput } from "@/lib/finance/parse";
import { assessRiskFlags } from "@/lib/finance/risk";
import {
  buildScenarioAssumptions,
  calculateScenario,
  type ScenarioId,
} from "@/lib/finance/scenarios";

// NovaPay is the hand-checked reference case (formerly
// scripts/novapay-validation.ts). Expected values are the displayed strings.
const novaPayInput = {
  currentRevenue: 1_500_000,
  revenueGrowth: parsePercentInput("80%") ?? 0,
  annualBurn: 1_800_000,
  cashBalance: 2_400_000,
  investmentAmount: 2_000_000,
  preMoneyValuation: 10_000_000,
  investmentHorizon: 5,
  expectedExitRevenueMultiple: 6,
  expectedFutureDilution: parsePercentInput("25") ?? 0,
};

const novaPay = calculateFinancialAnalysis(novaPayInput);
const assumptions = buildScenarioAssumptions(novaPayInput);

describe("NovaPay base analysis", () => {
  it("matches the hand-checked numbers", () => {
    expect({
      monthlyBurn: formatCurrency(novaPay.monthlyBurn),
      runwayMonths: formatRunwayMonths(novaPay.runwayMonths),
      postMoneyValuation: formatCurrency(novaPay.postMoneyValuation),
      initialInvestorOwnership: formatPercent(novaPay.initialInvestorOwnership),
      dilutedInvestorOwnership: formatPercent(novaPay.dilutedInvestorOwnership),
      projectedExitRevenue: formatCurrency(novaPay.projectedExitRevenue),
      projectedExitValuation: formatCurrency(novaPay.projectedExitValuation),
      investorExitProceeds: formatCurrency(novaPay.investorExitProceeds),
      moic: formatMoic(novaPay.moic),
      irr: formatPercent(novaPay.irr),
    }).toEqual({
      monthlyBurn: "$150,000",
      runwayMonths: "16 months",
      postMoneyValuation: "$12,000,000",
      initialInvestorOwnership: "16.7%",
      dilutedInvestorOwnership: "12.5%",
      projectedExitRevenue: "$28,343,520",
      projectedExitValuation: "$170,061,120",
      investorExitProceeds: "$21,257,640",
      moic: "10.6x",
      irr: "60.4%",
    });
  });
});

describe("NovaPay scenarios", () => {
  it("uses the user's own inputs for the base case", () => {
    expect(assumptions.base).toEqual({
      revenueGrowth: novaPayInput.revenueGrowth,
      exitRevenueMultiple: novaPayInput.expectedExitRevenueMultiple,
      futureDilution: novaPayInput.expectedFutureDilution,
    });

    const base = calculateScenario(novaPayInput, assumptions.base);
    expect(base.moic).toBe(novaPay.moic);
    expect(base.irr).toBe(novaPay.irr);
  });

  const expected: Record<ScenarioId, Record<string, string>> = {
    bear: {
      projectedExitRevenue: "$8,067,360",
      projectedExitValuation: "$32,269,440",
      dilutedInvestorOwnership: "10.8%",
      investorExitProceeds: "$3,495,856",
      moic: "1.7x",
      irr: "11.8%",
    },
    base: {
      projectedExitRevenue: "$28,343,520",
      projectedExitValuation: "$170,061,120",
      dilutedInvestorOwnership: "12.5%",
      investorExitProceeds: "$21,257,640",
      moic: "10.6x",
      irr: "60.4%",
    },
    bull: {
      projectedExitRevenue: "$48,000,000",
      projectedExitValuation: "$384,000,000",
      dilutedInvestorOwnership: "13.3%",
      investorExitProceeds: "$51,200,000",
      moic: "25.6x",
      irr: "91.3%",
    },
  };

  it.each(Object.keys(expected) as ScenarioId[])("%s case", (id) => {
    const outputs = calculateScenario(novaPayInput, assumptions[id]);
    expect({
      projectedExitRevenue: formatCurrency(outputs.projectedExitRevenue),
      projectedExitValuation: formatCurrency(outputs.projectedExitValuation),
      dilutedInvestorOwnership: formatPercent(outputs.dilutedInvestorOwnership),
      investorExitProceeds: formatCurrency(outputs.investorExitProceeds),
      moic: formatMoic(outputs.moic),
      irr: formatPercent(outputs.irr),
    }).toEqual(expected[id]);
  });
});

describe("NovaPay risk flags", () => {
  it("rates each metric as expected", () => {
    const bear = calculateScenario(novaPayInput, assumptions.bear);
    const bull = calculateScenario(novaPayInput, assumptions.bull);
    const flags = assessRiskFlags({
      analysisInputs: novaPayInput,
      analysisResults: novaPay,
      grossMargin: parsePercentInput("70") ?? 0,
      largestCustomerRevenue: parsePercentInput("22") ?? 0,
      bearIrr: bear.irr,
      bullIrr: bull.irr,
    });

    expect(
      flags.map(({ metric, value, status }) => ({ metric, value, status })),
    ).toEqual([
      { metric: "Revenue Growth", value: "80%", status: "Strong" },
      { metric: "Runway", value: "16 months", status: "Moderate" },
      { metric: "Gross Margin", value: "70%", status: "Strong" },
      { metric: "Customer Concentration", value: "22%", status: "Moderate Risk" },
      {
        metric: "Scenario Sensitivity",
        value: "79.5 percentage points",
        status: "High Sensitivity",
      },
    ]);
  });
});
