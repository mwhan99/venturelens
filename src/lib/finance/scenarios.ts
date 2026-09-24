import {
  calculateFinancialAnalysis,
  type AnalysisInputs,
  type AnalysisResults,
} from "@/lib/finance/engine";
import { parseNumericInput, parsePercentInput } from "@/lib/finance/parse";

export type ScenarioId = "bear" | "base" | "bull";

export type ScenarioAssumptions = {
  revenueGrowth: number;
  exitRevenueMultiple: number;
  futureDilution: number;
};

export type ScenarioDraft = {
  revenueGrowth: string;
  exitRevenueMultiple: string;
  futureDilution: string;
};

export type ScenarioOutputs = Pick<
  AnalysisResults,
  | "projectedExitRevenue"
  | "projectedExitValuation"
  | "dilutedInvestorOwnership"
  | "investorExitProceeds"
  | "moic"
  | "irr"
>;

export const defaultScenarioAssumptions: Record<
  ScenarioId,
  ScenarioAssumptions
> = {
  bear: {
    revenueGrowth: 0.35,
    exitRevenueMultiple: 4,
    futureDilution: 0.35,
  },
  base: {
    revenueGrowth: 0.8,
    exitRevenueMultiple: 6,
    futureDilution: 0.25,
  },
  bull: {
    revenueGrowth: 1,
    exitRevenueMultiple: 8,
    futureDilution: 0.2,
  },
};

export const defaultScenarioDrafts: Record<ScenarioId, ScenarioDraft> = {
  bear: {
    revenueGrowth: "35",
    exitRevenueMultiple: "4",
    futureDilution: "35",
  },
  base: {
    revenueGrowth: "80",
    exitRevenueMultiple: "6",
    futureDilution: "25",
  },
  bull: {
    revenueGrowth: "100",
    exitRevenueMultiple: "8",
    futureDilution: "20",
  },
};

export function parseScenarioDraft(
  draft: ScenarioDraft,
): ScenarioAssumptions | null {
  const revenueGrowth = parsePercentInput(draft.revenueGrowth);
  const exitRevenueMultiple = parseNumericInput(draft.exitRevenueMultiple);
  const futureDilution = parsePercentInput(draft.futureDilution);

  if (
    revenueGrowth === null ||
    exitRevenueMultiple === null ||
    futureDilution === null
  ) {
    return null;
  }

  return { revenueGrowth, exitRevenueMultiple, futureDilution };
}

export function calculateScenario(
  input: AnalysisInputs,
  assumptions: ScenarioAssumptions,
): ScenarioOutputs {
  const results = calculateFinancialAnalysis({
    ...input,
    revenueGrowth: assumptions.revenueGrowth,
    expectedExitRevenueMultiple: assumptions.exitRevenueMultiple,
    expectedFutureDilution: assumptions.futureDilution,
  });

  return {
    projectedExitRevenue: results.projectedExitRevenue,
    projectedExitValuation: results.projectedExitValuation,
    dilutedInvestorOwnership: results.dilutedInvestorOwnership,
    investorExitProceeds: results.investorExitProceeds,
    moic: results.moic,
    irr: results.irr,
  };
}
