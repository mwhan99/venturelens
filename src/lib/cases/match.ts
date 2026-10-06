import {
  historicalCases,
  RISK_TAG_LABELS,
  RISK_TAG_SIMILARITY,
  type HistoricalCase,
  type QuantitativeRiskTag,
  type RiskTag,
} from "@/data/historical-cases";
import { deriveQuantitativeRiskTags } from "@/lib/cases/risk-tags";
import {
  buildScenarioAssumptions,
  calculateScenario,
} from "@/lib/finance/scenarios";
import { assessRiskFlags, type RiskFlag } from "@/lib/finance/risk";
import type { SavedCompany } from "@/lib/storage/companies";

export const MIN_MATCHED_DIMENSIONS = 2;
export const MAX_MATCHED_CASES = 3;

export type HistoricalCaseMatch = {
  case: HistoricalCase;
  matchedTags: QuantitativeRiskTag[];
  unmatchedCaseTags: RiskTag[];
  matchedDimensionCount: number;
  similarities: string[];
  differences: string[];
};

export type HistoricalCaseMatchResult = {
  flags: RiskFlag[];
  riskTags: QuantitativeRiskTag[];
  matches: HistoricalCaseMatch[];
};

function scenarioIrrs(company: SavedCompany) {
  const assumptions = buildScenarioAssumptions(company.financialInputs);
  const bear = calculateScenario(company.financialInputs, assumptions.bear);
  const bull = calculateScenario(company.financialInputs, assumptions.bull);

  return { bearIrr: bear.irr, bullIrr: bull.irr };
}

export function assessCompanyRiskFlags(company: SavedCompany): RiskFlag[] {
  const { bearIrr, bullIrr } = scenarioIrrs(company);

  return assessRiskFlags({
    analysisInputs: company.financialInputs,
    analysisResults: company.calculatedMetrics,
    grossMargin: company.financialInputs.grossMargin,
    largestCustomerRevenue: company.businessRiskData.largestCustomerRevenue,
    bearIrr,
    bullIrr,
  });
}

function similaritiesFor(matchedTags: QuantitativeRiskTag[]) {
  return matchedTags.map((tag) => RISK_TAG_SIMILARITY[tag]);
}

function differencesFor(
  historicalCase: HistoricalCase,
  unmatchedCaseTags: RiskTag[],
) {
  const differences = [
    "This is a different company, market, and period. Shared risk patterns do not imply the same outcome.",
  ];

  if (unmatchedCaseTags.length > 0) {
    const labels = unmatchedCaseTags
      .map((tag) => RISK_TAG_LABELS[tag])
      .join(", ");
    differences.push(
      `The historical case is also associated with ${labels}, which is not indicated by this company's current quantitative screening outputs.`,
    );
  }

  differences.push(
    `${historicalCase.companyName} facts in this card come only from the sourced prototype case library, not from this startup's financial model.`,
  );

  return differences;
}

function matchCase(
  historicalCase: HistoricalCase,
  companyTags: QuantitativeRiskTag[],
): HistoricalCaseMatch | null {
  if (historicalCase.matchMode !== "quantitative") {
    return null;
  }

  const companyTagSet = new Set(companyTags);
  const matchedTags = historicalCase.riskTags.filter(
    (tag): tag is QuantitativeRiskTag =>
      companyTagSet.has(tag as QuantitativeRiskTag),
  );
  const unmatchedCaseTags = historicalCase.riskTags.filter(
    (tag) => !companyTagSet.has(tag as QuantitativeRiskTag),
  );

  if (matchedTags.length < MIN_MATCHED_DIMENSIONS) {
    return null;
  }

  return {
    case: historicalCase,
    matchedTags,
    unmatchedCaseTags,
    matchedDimensionCount: matchedTags.length,
    similarities: similaritiesFor(matchedTags),
    differences: differencesFor(historicalCase, unmatchedCaseTags),
  };
}

export function matchHistoricalCases(
  company: SavedCompany,
): HistoricalCaseMatchResult {
  const flags = assessCompanyRiskFlags(company);
  const riskTags = deriveQuantitativeRiskTags(company, flags);
  const matches = historicalCases
    .map((historicalCase) => matchCase(historicalCase, riskTags))
    .filter((match): match is HistoricalCaseMatch => match !== null)
    .sort((a, b) => b.matchedDimensionCount - a.matchedDimensionCount)
    .slice(0, MAX_MATCHED_CASES);

  return { flags, riskTags, matches };
}
