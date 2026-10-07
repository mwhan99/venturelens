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
  buildScenarioAssumptions,
  calculateScenario,
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
  executiveSummary: string;
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

function joinList(items: string[]) {
  if (items.length <= 1) {
    return items[0] ?? "";
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function indefinite(value: string) {
  return /^(8|11|18)/.test(value) ? "an" : "a";
}

function cautionPhrase(flag: RiskFlag) {
  if (flag.tone !== "caution") {
    return null;
  }

  if (flag.id === "runway") {
    return `${flag.value} of runway`;
  }

  if (flag.id === "gross-margin") {
    return `${indefinite(flag.value)} ${flag.value} gross margin`;
  }

  if (flag.id === "customer-concentration") {
    return `${flag.value} of revenue from the largest customer`;
  }

  if (flag.id === "revenue-growth") {
    return `only ${flag.value} revenue growth`;
  }

  if (flag.id === "scenario-sensitivity") {
    return `a wide return range (${flag.value})`;
  }

  return null;
}

function buildExecutiveSummary(company: SavedCompany, flags: RiskFlag[]) {
  const growth = flagById(flags, "revenue-growth");
  const runway = flagById(flags, "runway");
  const margin = flagById(flags, "gross-margin");
  const concentration = flagById(flags, "customer-concentration");
  const sensitivity = flagById(flags, "scenario-sensitivity");
  const name = company.profile.companyName || "The company";

  const strength =
    growth?.tone === "positive"
      ? `Strong ${growth.value} growth`
      : margin?.tone === "positive"
        ? `A strong ${margin.value} gross margin`
        : runway?.tone === "positive"
          ? `${runway.value} of cash runway`
          : concentration?.tone === "positive"
            ? `Diversified customer revenue (${concentration.value} from the largest customer)`
            : null;

  const risks = flags
    .map(cautionPhrase)
    .filter((phrase): phrase is string => phrase !== null && !phrase.startsWith("a wide return"));

  const shortRunway = runway?.tone === "caution";
  const lowMargin = margin?.tone === "caution";
  const concentrated = concentration?.tone === "caution";
  const weakGrowth = growth?.tone === "caution";

  let implication = "the current screen does not show a single dominant operating risk";
  if (shortRunway && lowMargin) {
    implication =
      "the company must raise soon on a business that isn't yet efficient";
  } else if (shortRunway && concentrated) {
    implication =
      "the company must raise soon while revenue depends on a narrow customer base";
  } else if (shortRunway) {
    implication = "the company must raise soon";
  } else if (lowMargin && concentrated) {
    implication =
      "the business is not yet efficient and depends on too few customers";
  } else if (lowMargin) {
    implication = "the business is not yet efficient";
  } else if (concentrated) {
    implication = "revenue depends heavily on one customer";
  } else if (weakGrowth) {
    implication = "commercial momentum is still limited";
  }

  let question = "what would have to change for this profile to weaken?";
  if (lowMargin) {
    question = "do margins improve with scale?";
  } else if (shortRunway) {
    question = "what does the company need to prove before the next raise?";
  } else if (concentrated) {
    question = "how durable is revenue if the largest customer leaves?";
  } else if (weakGrowth) {
    question = "what would it take for growth to reaccelerate?";
  } else if (sensitivity?.tone === "caution") {
    question = "which assumptions drive the return range?";
  }

  const sensitive = sensitivity?.tone === "caution";
  let opening: string;
  if (strength && risks.length > 0) {
    const verb = risks.length === 1 ? "means" : "mean";
    opening = `${strength}, but ${joinList(risks)} ${verb} ${implication}.`;
  } else if (risks.length > 0) {
    const verb = risks.length === 1 ? "means" : "mean";
    const listed = joinList(risks);
    opening = `${listed.charAt(0).toUpperCase()}${listed.slice(1)} ${verb} ${implication}.`;
  } else if (strength && sensitive && sensitivity) {
    opening = `${strength} is the clearest operating strength, but returns swing widely across scenarios (${sensitivity.value}).`;
  } else if (sensitive && sensitivity) {
    opening = `Returns swing widely across scenarios (${sensitivity.value}), and no other operating flag screens as high risk.`;
  } else if (strength) {
    opening = `${strength} is the clearest strength, and no operating flag screens as high risk.`;
  } else {
    opening = `${name} does not show a standout strength or a high-risk operating flag.`;
  }

  const sentences = [opening, `Key question: ${question}`];
  if (sensitive && sensitivity && risks.length > 0) {
    sentences.push(
      `Returns also move sharply between the bear and bull cases (${sensitivity.value}).`,
    );
  }

  return sentences.join(" ");
}

function companyScenarios(company: SavedCompany) {
  const assumptions = buildScenarioAssumptions(company.financialInputs);

  return {
    bear: calculateScenario(company.financialInputs, assumptions.bear),
    base: calculateScenario(company.financialInputs, assumptions.base),
    bull: calculateScenario(company.financialInputs, assumptions.bull),
  } satisfies Record<ScenarioId, ScenarioOutputs>;
}

function buildOverview(company: SavedCompany) {
  const { profile, financialInputs, businessRiskData } = company;
  const name = profile.companyName || "This company";
  const industry = profile.industry.trim();
  const stage = profile.stage.trim();

  let identity: string;
  if (industry && stage) {
    identity = `${name} is a ${stage}-stage ${industry} company.`;
  } else if (industry) {
    identity = `${name} operates in ${industry}.`;
  } else if (stage) {
    identity = `${name} is a ${stage}-stage company.`;
  } else {
    identity = `${name} is in the current VentureLens screen.`;
  }

  const customers =
    businessRiskData.customerCount === null
      ? "Customer count was not provided."
      : `The company has ${businessRiskData.customerCount} customers.`;

  const tam =
    businessRiskData.totalAddressableMarket === null
      ? "TAM was not provided."
      : `TAM is ${formatCurrency(businessRiskData.totalAddressableMarket)}.`;

  const source =
    company.source === "Simulated"
      ? "This is a simulated company for demonstration, not a live investment opportunity."
      : company.source === "Public Data"
        ? "The figures come from public data."
        : company.source === "Analyst Assumption"
          ? "The figures reflect analyst assumptions."
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
      `Current revenue is ${formatCurrency(financialInputs.currentRevenue)}.`,
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
    ? `Revenue is growing at ${growth.value}. ${growth.explanation}`
    : `Revenue growth is ${formatCompactPercent(financialInputs.revenueGrowth)}.`;

  const marginSentence = margin
    ? `Gross margin is ${margin.value}. ${margin.explanation}`
    : financialInputs.grossMargin === null
      ? "Gross margin was not provided."
      : `Gross margin is ${formatCompactPercent(financialInputs.grossMargin)}.`;

  const runwaySentence = runway
    ? `Runway is ${runway.value}. ${runway.explanation}`
    : `Runway is ${formatRunwayMonths(calculatedMetrics.runwayMonths)}.`;

  const burnSentence = `Annual burn is ${formatCurrency(financialInputs.annualBurn)}, with ${formatCurrency(financialInputs.cashBalance)} of cash on hand.`;

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
      `On these assumptions, modeled MOIC is ${formatMoic(calculatedMetrics.moic)} and modeled IRR is ${formatPercent(calculatedMetrics.irr)}.`,
      `Projected exit revenue is ${formatCurrency(calculatedMetrics.projectedExitRevenue)} and projected exit valuation is ${formatCurrency(calculatedMetrics.projectedExitValuation)}.`,
      "Those results move if growth, the exit multiple, dilution, or the holding period changes.",
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
      ? `The strongest signals are ${positive
          .map((flag) => `${flag.metric.toLowerCase()} at ${flag.value} (${flag.status.toLowerCase()})`)
          .join(", ")}.`
      : `Nothing in the operating screen stands out as a clear strength. Growth is ${formatCompactPercent(company.financialInputs.revenueGrowth)} and runway is ${formatRunwayMonths(company.calculatedMetrics.runwayMonths)}.`;

  const tagLabels = tags.map((tag) => RISK_TAG_LABELS[tag]);
  const primaryRisks = joinSentences([
    caution.length > 0
      ? `The main risks are ${caution
          .map((flag) => `${flag.metric.toLowerCase()} at ${flag.value} (${flag.status.toLowerCase()})`)
          .join(", ")}.`
      : "None of the standard operating flags screen as high risk.",
    tagLabels.length > 0
      ? `Related risk tags are ${tagLabels.join(", ")}.`
      : "",
  ]);

  const scenarioDependency = sensitivity
    ? `Returns show ${sensitivity.status.toLowerCase()}, with Bear-to-Bull IRR spanning ${sensitivity.value}.`
    : "Scenario sensitivity is not available.";

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
    executiveSummary: buildExecutiveSummary(company, flags),
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
