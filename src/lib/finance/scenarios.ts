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

export function buildScenarioAssumptions(
  inputs: AnalysisInputs,
): Record<ScenarioId, ScenarioAssumptions> {
  return {
    bear: {
      revenueGrowth: inputs.revenueGrowth * 0.5,
      exitRevenueMultiple: Math.max(1, inputs.expectedExitRevenueMultiple - 2),
      futureDilution: Math.min(0.9, inputs.expectedFutureDilution + 0.1),
    },
    base: {
      revenueGrowth: inputs.revenueGrowth,
      exitRevenueMultiple: inputs.expectedExitRevenueMultiple,
      futureDilution: inputs.expectedFutureDilution,
    },
    bull: {
      revenueGrowth: inputs.revenueGrowth * 1.25,
      exitRevenueMultiple: inputs.expectedExitRevenueMultiple + 2,
      futureDilution: Math.max(0, inputs.expectedFutureDilution - 0.05),
    },
  };
}

function formatEditableNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }

  return String(Math.round(value * 100) / 100);
}

function assumptionToDraft(assumptions: ScenarioAssumptions): ScenarioDraft {
  return {
    revenueGrowth: formatEditableNumber(assumptions.revenueGrowth * 100),
    exitRevenueMultiple: formatEditableNumber(assumptions.exitRevenueMultiple),
    futureDilution: formatEditableNumber(assumptions.futureDilution * 100),
  };
}

export function buildScenarioDrafts(
  inputs: AnalysisInputs,
): Record<ScenarioId, ScenarioDraft> {
  const assumptions = buildScenarioAssumptions(inputs);

  return {
    bear: assumptionToDraft(assumptions.bear),
    base: assumptionToDraft(assumptions.base),
    bull: assumptionToDraft(assumptions.bull),
  };
}

function draftsMatch(left: ScenarioDraft, right: ScenarioDraft) {
  return (
    left.revenueGrowth === right.revenueGrowth &&
    left.exitRevenueMultiple === right.exitRevenueMultiple &&
    left.futureDilution === right.futureDilution
  );
}

export function resolveScenarioAssumption(
  inputs: AnalysisInputs,
  id: ScenarioId,
  draft: ScenarioDraft,
): ScenarioAssumptions | null {
  const assumptions = buildScenarioAssumptions(inputs);
  if (draftsMatch(draft, assumptionToDraft(assumptions[id]))) {
    return assumptions[id];
  }

  return parseScenarioDraft(draft);
}

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
