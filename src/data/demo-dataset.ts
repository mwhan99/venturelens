import { calculateFinancialAnalysis } from "@/lib/finance/engine";
import { parsePercentInput } from "@/lib/finance/parse";
import type { SavedCompany } from "@/lib/storage/companies";

type DemoSeed = {
  companyName: string;
  industry: string;
  stage: string;
  currentRevenue: number;
  revenueGrowthPercent: number;
  grossMarginPercent: number;
  annualBurn: number;
  cashBalance: number;
  investmentAmount: number;
  preMoneyValuation: number;
  investmentHorizon: number;
  expectedExitRevenueMultiple: number;
  expectedFutureDilutionPercent: number;
  customerCount: number;
  largestCustomerRevenuePercent: number;
  totalAddressableMarket: number;
};

export const demoCompanySeeds: DemoSeed[] = [
  {
    companyName: "NovaPay",
    industry: "FinTech",
    stage: "Seed",
    currentRevenue: 1_500_000,
    revenueGrowthPercent: 80,
    grossMarginPercent: 70,
    annualBurn: 1_800_000,
    cashBalance: 2_400_000,
    investmentAmount: 2_000_000,
    preMoneyValuation: 10_000_000,
    investmentHorizon: 5,
    expectedExitRevenueMultiple: 6,
    expectedFutureDilutionPercent: 25,
    customerCount: 120,
    largestCustomerRevenuePercent: 22,
    totalAddressableMarket: 2_000_000_000,
  },
  {
    companyName: "CloudCore",
    industry: "SaaS",
    stage: "Seed",
    currentRevenue: 2_200_000,
    revenueGrowthPercent: 55,
    grossMarginPercent: 82,
    annualBurn: 1_400_000,
    cashBalance: 2_800_000,
    investmentAmount: 2_500_000,
    preMoneyValuation: 14_000_000,
    investmentHorizon: 5,
    expectedExitRevenueMultiple: 7,
    expectedFutureDilutionPercent: 25,
    customerCount: 180,
    largestCustomerRevenuePercent: 12,
    totalAddressableMarket: 3_500_000_000,
  },
  {
    companyName: "MedFlow",
    industry: "HealthTech",
    stage: "Series A",
    currentRevenue: 4_500_000,
    revenueGrowthPercent: 45,
    grossMarginPercent: 68,
    annualBurn: 3_200_000,
    cashBalance: 5_000_000,
    investmentAmount: 4_000_000,
    preMoneyValuation: 24_000_000,
    investmentHorizon: 5,
    expectedExitRevenueMultiple: 6,
    expectedFutureDilutionPercent: 20,
    customerCount: 95,
    largestCustomerRevenuePercent: 18,
    totalAddressableMarket: 6_000_000_000,
  },
  {
    companyName: "GreenGrid",
    industry: "ClimateTech",
    stage: "Seed",
    currentRevenue: 1_000_000,
    revenueGrowthPercent: 95,
    grossMarginPercent: 48,
    annualBurn: 2_400_000,
    cashBalance: 1_600_000,
    investmentAmount: 3_000_000,
    preMoneyValuation: 12_000_000,
    investmentHorizon: 6,
    expectedExitRevenueMultiple: 5,
    expectedFutureDilutionPercent: 35,
    customerCount: 42,
    largestCustomerRevenuePercent: 28,
    totalAddressableMarket: 12_000_000_000,
  },
  {
    companyName: "RetailAI",
    industry: "AI / RetailTech",
    stage: "Series A",
    currentRevenue: 6_000_000,
    revenueGrowthPercent: 70,
    grossMarginPercent: 76,
    annualBurn: 4_000_000,
    cashBalance: 7_000_000,
    investmentAmount: 5_000_000,
    preMoneyValuation: 35_000_000,
    investmentHorizon: 5,
    expectedExitRevenueMultiple: 8,
    expectedFutureDilutionPercent: 25,
    customerCount: 240,
    largestCustomerRevenuePercent: 15,
    totalAddressableMarket: 8_000_000_000,
  },
  {
    companyName: "SecureStack",
    industry: "Cybersecurity",
    stage: "Seed",
    currentRevenue: 1_800_000,
    revenueGrowthPercent: 65,
    grossMarginPercent: 85,
    annualBurn: 1_700_000,
    cashBalance: 3_200_000,
    investmentAmount: 2_500_000,
    preMoneyValuation: 16_000_000,
    investmentHorizon: 5,
    expectedExitRevenueMultiple: 8,
    expectedFutureDilutionPercent: 20,
    customerCount: 135,
    largestCustomerRevenuePercent: 10,
    totalAddressableMarket: 10_000_000_000,
  },
  {
    companyName: "FoodLoop",
    industry: "FoodTech",
    stage: "Seed",
    currentRevenue: 2_800_000,
    revenueGrowthPercent: 30,
    grossMarginPercent: 42,
    annualBurn: 2_600_000,
    cashBalance: 2_000_000,
    investmentAmount: 2_000_000,
    preMoneyValuation: 11_000_000,
    investmentHorizon: 5,
    expectedExitRevenueMultiple: 3,
    expectedFutureDilutionPercent: 30,
    customerCount: 310,
    largestCustomerRevenuePercent: 8,
    totalAddressableMarket: 5_000_000_000,
  },
  {
    companyName: "LegalMind",
    industry: "LegalTech",
    stage: "Seed",
    currentRevenue: 900_000,
    revenueGrowthPercent: 110,
    grossMarginPercent: 88,
    annualBurn: 2_100_000,
    cashBalance: 2_700_000,
    investmentAmount: 3_000_000,
    preMoneyValuation: 20_000_000,
    investmentHorizon: 5,
    expectedExitRevenueMultiple: 9,
    expectedFutureDilutionPercent: 30,
    customerCount: 75,
    largestCustomerRevenuePercent: 32,
    totalAddressableMarket: 4_000_000_000,
  },
  {
    companyName: "LogiFlow",
    industry: "LogisticsTech",
    stage: "Series A",
    currentRevenue: 5_500_000,
    revenueGrowthPercent: 40,
    grossMarginPercent: 58,
    annualBurn: 3_600_000,
    cashBalance: 6_500_000,
    investmentAmount: 4_000_000,
    preMoneyValuation: 28_000_000,
    investmentHorizon: 5,
    expectedExitRevenueMultiple: 5,
    expectedFutureDilutionPercent: 25,
    customerCount: 420,
    largestCustomerRevenuePercent: 14,
    totalAddressableMarket: 15_000_000_000,
  },
  {
    companyName: "CreatorHub",
    industry: "CreatorTech",
    stage: "Seed",
    currentRevenue: 1_300_000,
    revenueGrowthPercent: 75,
    grossMarginPercent: 73,
    annualBurn: 1_900_000,
    cashBalance: 2_200_000,
    investmentAmount: 2_000_000,
    preMoneyValuation: 13_000_000,
    investmentHorizon: 5,
    expectedExitRevenueMultiple: 7,
    expectedFutureDilutionPercent: 30,
    customerCount: 160,
    largestCustomerRevenuePercent: 26,
    totalAddressableMarket: 7_000_000_000,
  },
];

export const demoCompanyNames = demoCompanySeeds.map((seed) => seed.companyName);

function requirePercent(value: number) {
  return parsePercentInput(String(value)) ?? 0;
}

export function buildDemoCompanies(): Omit<SavedCompany, "id" | "dateAnalyzed">[] {
  return demoCompanySeeds.map((seed) => {
    const inputs = {
      currentRevenue: seed.currentRevenue,
      revenueGrowth: requirePercent(seed.revenueGrowthPercent),
      annualBurn: seed.annualBurn,
      cashBalance: seed.cashBalance,
      investmentAmount: seed.investmentAmount,
      preMoneyValuation: seed.preMoneyValuation,
      investmentHorizon: seed.investmentHorizon,
      expectedExitRevenueMultiple: seed.expectedExitRevenueMultiple,
      expectedFutureDilution: requirePercent(seed.expectedFutureDilutionPercent),
    };

    return {
      source: "Simulated" as const,
      profile: {
        companyName: seed.companyName,
        industry: seed.industry,
        stage: seed.stage,
      },
      financialInputs: {
        ...inputs,
        grossMargin: requirePercent(seed.grossMarginPercent),
      },
      businessRiskData: {
        customerCount: seed.customerCount,
        largestCustomerRevenue: requirePercent(
          seed.largestCustomerRevenuePercent,
        ),
        totalAddressableMarket: seed.totalAddressableMarket,
      },
      calculatedMetrics: calculateFinancialAnalysis(inputs),
    };
  });
}
