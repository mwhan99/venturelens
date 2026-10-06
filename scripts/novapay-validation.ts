import { calculateFinancialAnalysis } from "../src/lib/finance/engine";
import {
  formatCurrency,
  formatMoic,
  formatPercent,
  formatRunwayMonths,
} from "../src/lib/finance/format";
import { parsePercentInput } from "../src/lib/finance/parse";
import { assessRiskFlags } from "../src/lib/finance/risk";
import {
  buildScenarioAssumptions,
  calculateScenario,
  type ScenarioId,
} from "../src/lib/finance/scenarios";

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

const expectedBaseAnalysis = {
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
} as const;

const actualBaseAnalysis = {
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
};

const expectedScenarios: Record<
  ScenarioId,
  {
    projectedExitRevenue: string;
    projectedExitValuation: string;
    dilutedInvestorOwnership: string;
    investorExitProceeds: string;
    moic: string;
    irr: string;
  }
> = {
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

let failed = 0;

for (const key of Object.keys(
  expectedBaseAnalysis,
) as (keyof typeof expectedBaseAnalysis)[]) {
  if (actualBaseAnalysis[key] !== expectedBaseAnalysis[key]) {
    failed += 1;
    console.error(
      `Base analysis mismatch ${key}: expected ${expectedBaseAnalysis[key]}, got ${actualBaseAnalysis[key]}`,
    );
  }
}

const scenarioAssumptions = buildScenarioAssumptions(novaPayInput);

if (
  scenarioAssumptions.base.revenueGrowth !== novaPayInput.revenueGrowth ||
  scenarioAssumptions.base.exitRevenueMultiple !==
    novaPayInput.expectedExitRevenueMultiple ||
  scenarioAssumptions.base.futureDilution !== novaPayInput.expectedFutureDilution
) {
  failed += 1;
  console.error("Base scenario assumptions do not match the user's inputs");
}

const baseScenario = calculateScenario(novaPayInput, scenarioAssumptions.base);
if (baseScenario.moic !== novaPay.moic || baseScenario.irr !== novaPay.irr) {
  failed += 1;
  console.error(
    `Base scenario returns do not match financial analysis: MOIC ${baseScenario.moic} vs ${novaPay.moic}, IRR ${baseScenario.irr} vs ${novaPay.irr}`,
  );
}

for (const id of Object.keys(expectedScenarios) as ScenarioId[]) {
  const outputs = calculateScenario(novaPayInput, scenarioAssumptions[id]);
  const actual = {
    projectedExitRevenue: formatCurrency(outputs.projectedExitRevenue),
    projectedExitValuation: formatCurrency(outputs.projectedExitValuation),
    dilutedInvestorOwnership: formatPercent(outputs.dilutedInvestorOwnership),
    investorExitProceeds: formatCurrency(outputs.investorExitProceeds),
    moic: formatMoic(outputs.moic),
    irr: formatPercent(outputs.irr),
  };

  for (const key of Object.keys(expectedScenarios[id]) as (keyof typeof actual)[]) {
    if (actual[key] !== expectedScenarios[id][key]) {
      failed += 1;
      console.error(
        `${id} mismatch ${key}: expected ${expectedScenarios[id][key]}, got ${actual[key]}`,
      );
    }
  }
}

const bear = calculateScenario(novaPayInput, scenarioAssumptions.bear);
const bull = calculateScenario(novaPayInput, scenarioAssumptions.bull);
const riskFlags = assessRiskFlags({
  analysisInputs: novaPayInput,
  analysisResults: novaPay,
  grossMargin: parsePercentInput("70") ?? 0,
  largestCustomerRevenue: parsePercentInput("22") ?? 0,
  bearIrr: bear.irr,
  bullIrr: bull.irr,
});

const expectedRisk = [
  {
    metric: "Revenue Growth",
    value: "80%",
    status: "Strong",
  },
  {
    metric: "Runway",
    value: "16 months",
    status: "Moderate",
  },
  {
    metric: "Gross Margin",
    value: "70%",
    status: "Strong",
  },
  {
    metric: "Customer Concentration",
    value: "22%",
    status: "Moderate Risk",
  },
  {
    metric: "Scenario Sensitivity",
    value: "79.5 percentage points",
    status: "High Sensitivity",
  },
];

for (const [index, expected] of expectedRisk.entries()) {
  const actual = riskFlags[index];
  if (
    !actual ||
    actual.metric !== expected.metric ||
    actual.value !== expected.value ||
    actual.status !== expected.status
  ) {
    failed += 1;
    console.error(
      `Risk mismatch ${expected.metric}: expected ${JSON.stringify(expected)}, got ${JSON.stringify({
        metric: actual?.metric,
        value: actual?.value,
        status: actual?.status,
      })}`,
    );
  }
}

if (failed > 0) {
  console.error(`NovaPay validation failed: ${failed} mismatches`);
  process.exit(1);
}

console.log("NovaPay analysis, scenario, and risk validation passed");
