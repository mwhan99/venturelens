import { RISK_TAG_LABELS, type QuantitativeRiskTag } from "@/data/historical-cases";
import { buildDatasetBenchmark, type BenchmarkMetric } from "@/lib/benchmark/dataset";
import {
  matchHistoricalCases,
  type HistoricalCaseMatch,
} from "@/lib/cases/match";
import {
  formatCompactPercent,
  formatCurrency,
  formatMoic,
  formatPercent,
  formatPercentagePoints,
  formatRunwayMonths,
} from "@/lib/finance/format";
import type { RiskFlag } from "@/lib/finance/risk";
import {
  calculateScenario,
  defaultScenarioAssumptions,
  type ScenarioId,
  type ScenarioOutputs,
} from "@/lib/finance/scenarios";
import type { SavedCompany } from "@/lib/storage/companies";

export type MemoMetric = {
  label: string;
  value: string;
};

export type MemoScenarioRow = {
  id: ScenarioId;
  label: string;
  exitValuation: string;
  moic: string;
  irr: string;
};

export type DiligenceQuestion = {
  id: string;
  question: string;
};

export type InvestmentMemoModel = {
  company: SavedCompany;
  overview: {
    metrics: MemoMetric[];
    narrative: string;
  };
  financial: {
    metrics: MemoMetric[];
    narrative: string;
    datasetContext: string;
    benchmark: BenchmarkMetric[];
  };
  terms: {
    metrics: MemoMetric[];
  };
  returns: {
    metrics: MemoMetric[];
    disclaimer: string;
    narrative: string;
  };
  scenarios: {
    rows: MemoScenarioRow[];
    sensitivity: RiskFlag | null;
    narrative: string;
  };
  risks: {
    flags: RiskFlag[];
    matches: HistoricalCaseMatch[];
    emptyMatchCopy: string;
    historicalDisclaimer: string;
  };
  diligenceQuestions: DiligenceQuestion[];
  takeaways: {
    strongestSignals: string;
    primaryRisks: string;
    scenarioDependency: string;
    furtherDiligence: string;
  };
};

const SCENARIO_LABELS: Record<ScenarioId, string> = {
  bear: "Bear",
  base: "Base",
  bull: "Bull",
};

const DILIGENCE_BY_TAG: Partial<Record<QuantitativeRiskTag, string>> = {
  "runway-risk":
    "What milestones must the company achieve before additional financing may be required?",
  "financing-dependency":
    "How would the operating plan change if the next financing round were delayed?",
  "high-burn":
    "Which operating expenses are driving cash burn, and how flexible are they?",
  "weak-capital-efficiency":
    "How efficiently is incremental spending translating into revenue growth?",
  "financing-risk":
    "Which assumptions have the largest effect on modeled investor returns?",
  "aggressive-growth":
    "What operating evidence supports that current growth can continue without a matching increase in cash needs?",
  "capital-intensive":
    "How much additional capital is required to maintain or scale the current operating model?",
};

const DILIGENCE_TAG_ORDER: QuantitativeRiskTag[] = [
  "runway-risk",
  "financing-dependency",
  "high-burn",
  "weak-capital-efficiency",
  "capital-intensive",
  "financing-risk",
  "aggressive-growth",
];

function optionalNumber(
  value: number | null,
  format: (value: number) => string,
) {
  return value === null ? "—" : format(value);
}

function flagById(flags: RiskFlag[], id: string) {
  return flags.find((flag) => flag.id === id) ?? null;
}

function joinSentences(parts: string[]) {
  return parts.filter(Boolean).join(" ");
}

function companyScenarios(company: SavedCompany) {
  return {
    bear: calculateScenario(
      company.financialInputs,
      defaultScenarioAssumptions.bear,
    ),
    base: calculateScenario(
      company.financialInputs,
      defaultScenarioAssumptions.base,
    ),
    bull: calculateScenario(
      company.financialInputs,
      defaultScenarioAssumptions.bull,
    ),
  } satisfies Record<ScenarioId, ScenarioOutputs>;
}

function buildOverview(company: SavedCompany) {
  const { profile, financialInputs, businessRiskData } = company;
  const name = profile.companyName || "This company";
  const industry = profile.industry.trim();
  const stage = profile.stage.trim();

  let identity: string;
  if (industry && stage) {
    identity = `${name} is recorded as a ${stage}-stage ${industry} company.`;
  } else if (industry) {
    identity = `${name} is recorded in the ${industry} industry.`;
  } else if (stage) {
    identity = `${name} is recorded as a ${stage}-stage company.`;
  } else {
    identity = `${name} is a saved screening record in VentureLens.`;
  }

  const customers =
    businessRiskData.customerCount === null
      ? "Customer count is not recorded."
      : `The record lists ${businessRiskData.customerCount} customers.`;

  const tam =
    businessRiskData.totalAddressableMarket === null
      ? "Total addressable market is not recorded."
      : `Stored TAM is ${formatCurrency(businessRiskData.totalAddressableMarket)}.`;

  const source =
    company.source === "Simulated"
      ? "This record is labeled Simulated."
      : company.source === "Public Data"
        ? "This record is labeled Public Data."
        : company.source === "Analyst Assumption"
          ? "This record is labeled Analyst Assumption."
          : "";

  return {
    metrics: [
      { label: "Company", value: name },
      { label: "Industry", value: industry || "—" },
      { label: "Stage", value: stage || "—" },
      {
        label: "Current Revenue",
        value: formatCurrency(financialInputs.currentRevenue),
      },
      {
        label: "TAM",
        value: optionalNumber(
          businessRiskData.totalAddressableMarket,
          formatCurrency,
        ),
      },
      {
        label: "Customer Count",
        value:
          businessRiskData.customerCount === null
            ? "—"
            : String(businessRiskData.customerCount),
      },
    ],
    narrative: joinSentences([
      identity,
      `Current revenue in the screening inputs is ${formatCurrency(financialInputs.currentRevenue)}.`,
      customers,
      tam,
      source,
    ]),
  };
}

function buildFinancial(
  company: SavedCompany,
  flags: RiskFlag[],
  companies: SavedCompany[],
) {
  const growth = flagById(flags, "revenue-growth");
  const runway = flagById(flags, "runway");
  const margin = flagById(flags, "gross-margin");
  const { financialInputs, calculatedMetrics } = company;
  const benchmark = buildDatasetBenchmark(company, companies);

  const growthSentence = growth
    ? `Revenue growth is ${growth.value} and is classified as ${growth.status}. ${growth.explanation}`
    : `Revenue growth in the current inputs is ${formatCompactPercent(financialInputs.revenueGrowth)}.`;

  const marginSentence = margin
    ? `Gross margin is ${margin.value} and is classified as ${margin.status}. ${margin.explanation}`
    : financialInputs.grossMargin === null
      ? "Gross margin is not recorded."
      : `Gross margin in the current inputs is ${formatCompactPercent(financialInputs.grossMargin)}.`;

  const runwaySentence = runway
    ? `Runway is ${runway.value} and is classified as ${runway.status}. ${runway.explanation}`
    : `Modeled runway is ${formatRunwayMonths(calculatedMetrics.runwayMonths)}.`;

  const burnSentence = `The current inputs show annual burn of ${formatCurrency(financialInputs.annualBurn)} and a cash balance of ${formatCurrency(financialInputs.cashBalance)}.`;

  const runwayMetric = benchmark.find((item) => item.id === "runway");
  const growthMetric = benchmark.find((item) => item.id === "revenueGrowth");
  const marginMetric = benchmark.find((item) => item.id === "grossMargin");

  const datasetContext = joinSentences([
    "Relative to the median of companies currently saved in this browser:",
    growthMetric
      ? `revenue growth is ${growthMetric.selected} versus ${growthMetric.median} (${growthMetric.difference}).`
      : "",
    marginMetric
      ? `Gross margin is ${marginMetric.selected} versus ${marginMetric.median} (${marginMetric.difference}).`
      : "",
    runwayMetric
      ? `Runway is ${runwayMetric.selected} versus ${runwayMetric.median} (${runwayMetric.difference}).`
      : "",
    "These comparisons are to the saved VentureLens dataset, not to an external market average.",
  ]);

  return {
    metrics: [
      {
        label: "Revenue Growth",
        value: formatCompactPercent(financialInputs.revenueGrowth),
      },
      {
        label: "Gross Margin",
        value: optionalNumber(financialInputs.grossMargin, formatCompactPercent),
      },
      {
        label: "Annual Burn",
        value: formatCurrency(financialInputs.annualBurn),
      },
      {
        label: "Cash Balance",
        value: formatCurrency(financialInputs.cashBalance),
      },
      {
        label: "Runway",
        value: formatRunwayMonths(calculatedMetrics.runwayMonths),
      },
    ],
    narrative: joinSentences([
      growthSentence,
      marginSentence,
      burnSentence,
      runwaySentence,
    ]),
    datasetContext,
    benchmark,
  };
}

function buildTerms(company: SavedCompany) {
  const { financialInputs, calculatedMetrics } = company;

  return {
    metrics: [
      {
        label: "Investment Amount",
        value: formatCurrency(financialInputs.investmentAmount),
      },
      {
        label: "Pre-Money Valuation",
        value: formatCurrency(financialInputs.preMoneyValuation),
      },
      {
        label: "Post-Money Valuation",
        value: formatCurrency(calculatedMetrics.postMoneyValuation),
      },
      {
        label: "Initial Investor Ownership",
        value: formatPercent(calculatedMetrics.initialInvestorOwnership),
      },
      {
        label: "Expected Future Dilution",
        value: formatCompactPercent(financialInputs.expectedFutureDilution),
      },
      {
        label: "Diluted Investor Ownership",
        value: formatPercent(calculatedMetrics.dilutedInvestorOwnership),
      },
      {
        label: "Investment Horizon",
        value: `${financialInputs.investmentHorizon} years`,
      },
    ],
  };
}

function buildReturns(company: SavedCompany) {
  const { calculatedMetrics } = company;
  const disclaimer =
    "Modeled outputs based on user-provided assumptions. These figures are not forecasts or investment recommendations.";

  return {
    metrics: [
      {
        label: "Projected Exit Revenue",
        value: formatCurrency(calculatedMetrics.projectedExitRevenue),
      },
      {
        label: "Projected Exit Valuation",
        value: formatCurrency(calculatedMetrics.projectedExitValuation),
      },
      {
        label: "Investor Exit Proceeds",
        value: formatCurrency(calculatedMetrics.investorExitProceeds),
      },
      { label: "Modeled MOIC", value: formatMoic(calculatedMetrics.moic) },
      { label: "Modeled IRR", value: formatPercent(calculatedMetrics.irr) },
    ],
    disclaimer,
    narrative: joinSentences([
      `The model indicates a MOIC of ${formatMoic(calculatedMetrics.moic)} and an IRR of ${formatPercent(calculatedMetrics.irr)} under the saved screening assumptions.`,
      `Projected exit revenue is ${formatCurrency(calculatedMetrics.projectedExitRevenue)} and projected exit valuation is ${formatCurrency(calculatedMetrics.projectedExitValuation)}.`,
      "These results change if growth, exit multiple, dilution, or horizon inputs change.",
    ]),
  };
}

function buildScenarios(company: SavedCompany, flags: RiskFlag[]) {
  const scenarios = companyScenarios(company);
  const sensitivity = flagById(flags, "scenario-sensitivity");
  const irrSpan =
    (scenarios.bull.irr - scenarios.bear.irr) * 100;
  const moicSpan = scenarios.bull.moic - scenarios.bear.moic;

  const rows: MemoScenarioRow[] = (["bear", "base", "bull"] as ScenarioId[]).map(
    (id) => ({
      id,
      label: SCENARIO_LABELS[id],
      exitValuation: formatCurrency(scenarios[id].projectedExitValuation),
      moic: formatMoic(scenarios[id].moic),
      irr: formatPercent(scenarios[id].irr),
    }),
  );

  const sensitivitySentence = sensitivity
    ? `The existing scenario-sensitivity flag is ${sensitivity.status} (${sensitivity.value}). ${sensitivity.explanation}`
    : "Scenario sensitivity could not be classified from the current outputs.";

  return {
    rows,
    sensitivity,
    narrative: joinSentences([
      `Using the existing VentureLens Bear, Base, and Bull assumption sets, modeled IRR ranges from ${formatPercent(scenarios.bear.irr)} to ${formatPercent(scenarios.bull.irr)}, a span of ${formatPercentagePoints(irrSpan)} percentage points.`,
      `Modeled MOIC ranges from ${formatMoic(scenarios.bear.moic)} to ${formatMoic(scenarios.bull.moic)} (${formatMoic(moicSpan)} difference).`,
      sensitivitySentence,
    ]),
  };
}

function buildDiligenceQuestions(
  tags: QuantitativeRiskTag[],
  flags: RiskFlag[],
): DiligenceQuestion[] {
  const questions: DiligenceQuestion[] = [];
  const tagSet = new Set(tags);

  for (const tag of DILIGENCE_TAG_ORDER) {
    if (!tagSet.has(tag) || !DILIGENCE_BY_TAG[tag]) {
      continue;
    }
    questions.push({ id: tag, question: DILIGENCE_BY_TAG[tag]! });
  }

  const concentration = flagById(flags, "customer-concentration");
  if (concentration?.status === "High Risk") {
    questions.push({
      id: "customer-concentration",
      question:
        "How would revenue be affected if the largest customer reduced or ended its relationship?",
    });
  }

  const sensitivity = flagById(flags, "scenario-sensitivity");
  if (
    sensitivity?.status === "High Sensitivity" &&
    !questions.some((item) => item.id === "financing-risk")
  ) {
    questions.push({
      id: "scenario-sensitivity",
      question:
        "Which assumptions have the largest effect on modeled investor returns?",
    });
  }

  return questions.slice(0, 6);
}

function buildTakeaways(
  company: SavedCompany,
  flags: RiskFlag[],
  tags: QuantitativeRiskTag[],
  questions: DiligenceQuestion[],
) {
  const positive = flags.filter((flag) => flag.tone === "positive");
  const caution = flags.filter((flag) => flag.tone === "caution");
  const sensitivity = flagById(flags, "scenario-sensitivity");

  const strongestSignals =
    positive.length > 0
      ? `The current inputs show ${positive
          .map((flag) => `${flag.metric} classified as ${flag.status} (${flag.value})`)
          .join("; ")}.`
      : `The current inputs do not include a positively classified operating flag. Saved screening still records revenue growth of ${formatCompactPercent(company.financialInputs.revenueGrowth)} and runway of ${formatRunwayMonths(company.calculatedMetrics.runwayMonths)}.`;

  const tagLabels = tags.map((tag) => RISK_TAG_LABELS[tag]);
  const primaryRisks = joinSentences([
    caution.length > 0
      ? `The analysis highlights ${caution
          .map((flag) => `${flag.metric} (${flag.status}, ${flag.value})`)
          .join("; ")}.`
      : "The analysis does not classify any of the standard operating flags as high-risk in the current record.",
    tagLabels.length > 0
      ? `Quantitative risk tags generated from the existing outputs are ${tagLabels.join(", ")}.`
      : "",
  ]);

  const scenarioDependency = sensitivity
    ? `The model indicates ${sensitivity.status} to scenario assumptions, with a modeled IRR span of ${sensitivity.value} between the existing Bear and Bull cases.`
    : "Scenario sensitivity is not available from the current outputs.";

  const furtherDiligence =
    questions.length > 0
      ? `Further diligence is needed on the priorities listed below, including questions tied to ${questions
          .slice(0, 4)
          .map((item) => item.id.replace(/-/g, " "))
          .join(", ")}.`
      : "Further diligence is needed on items not measured by the current quantitative screening inputs, including governance and disclosure quality.";

  return {
    strongestSignals,
    primaryRisks,
    scenarioDependency,
    furtherDiligence,
  };
}

export function buildInvestmentMemo(
  company: SavedCompany,
  companies: SavedCompany[],
): InvestmentMemoModel {
  const { flags, riskTags, matches } = matchHistoricalCases(company);
  const diligenceQuestions = buildDiligenceQuestions(riskTags, flags);

  return {
    company,
    overview: buildOverview(company),
    financial: buildFinancial(company, flags, companies),
    terms: buildTerms(company),
    returns: buildReturns(company),
    scenarios: buildScenarios(company, flags),
    risks: {
      flags,
      matches,
      emptyMatchCopy:
        "No strong historical case match was identified from the current prototype library.",
      historicalDisclaimer:
        "Historical similarity illustrates selected risk patterns and does not imply the same outcome.",
    },
    diligenceQuestions,
    takeaways: buildTakeaways(company, flags, riskTags, diligenceQuestions),
  };
}
