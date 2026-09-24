export type AnalysisInputs = {
  currentRevenue: number;
  revenueGrowth: number;
  annualBurn: number;
  cashBalance: number;
  investmentAmount: number;
  preMoneyValuation: number;
  investmentHorizon: number;
  expectedExitRevenueMultiple: number;
  expectedFutureDilution: number;
};

export type AnalysisResults = {
  monthlyBurn: number;
  runwayMonths: number;
  postMoneyValuation: number;
  initialInvestorOwnership: number;
  dilutedInvestorOwnership: number;
  projectedExitRevenue: number;
  projectedExitValuation: number;
  investorExitProceeds: number;
  moic: number;
  irr: number;
};

export function calculateFinancialAnalysis(
  input: AnalysisInputs,
): AnalysisResults {
  const monthlyBurn = input.annualBurn / 12;
  const runwayMonths = input.cashBalance / monthlyBurn;
  const postMoneyValuation =
    input.preMoneyValuation + input.investmentAmount;
  const initialInvestorOwnership =
    input.investmentAmount / postMoneyValuation;
  const dilutedInvestorOwnership =
    initialInvestorOwnership * (1 - input.expectedFutureDilution);
  const projectedExitRevenue =
    input.currentRevenue *
    (1 + input.revenueGrowth) ** input.investmentHorizon;
  const projectedExitValuation =
    projectedExitRevenue * input.expectedExitRevenueMultiple;
  const investorExitProceeds =
    projectedExitValuation * dilutedInvestorOwnership;
  const moic = investorExitProceeds / input.investmentAmount;
  const irr = moic ** (1 / input.investmentHorizon) - 1;

  return {
    monthlyBurn,
    runwayMonths,
    postMoneyValuation,
    initialInvestorOwnership,
    dilutedInvestorOwnership,
    projectedExitRevenue,
    projectedExitValuation,
    investorExitProceeds,
    moic,
    irr,
  };
}
