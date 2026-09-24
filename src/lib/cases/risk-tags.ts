import type { RiskFlag } from "@/lib/finance/risk";
import type { QuantitativeRiskTag } from "@/data/historical-cases";
import type { SavedCompany } from "@/lib/storage/companies";

function flagById(flags: RiskFlag[], id: string) {
  return flags.find((flag) => flag.id === id) ?? null;
}

function uniqueTags(tags: QuantitativeRiskTag[]) {
  return [...new Set(tags)];
}

/**
 * Maps existing risk-flag statuses and stored screening metrics to quantitative
 * risk tags. Governance / disclosure / diligence tags are never emitted here.
 */
export function deriveQuantitativeRiskTags(
  company: SavedCompany,
  flags: RiskFlag[],
): QuantitativeRiskTag[] {
  const tags: QuantitativeRiskTag[] = [];
  const growth = flagById(flags, "revenue-growth");
  const runway = flagById(flags, "runway");
  const grossMargin = flagById(flags, "gross-margin");
  const sensitivity = flagById(flags, "scenario-sensitivity");

  const { currentRevenue, annualBurn } = company.financialInputs;
  const spendsAboveRevenue = currentRevenue > 0 && annualBurn > currentRevenue;
  const lowGrossMargin = grossMargin?.status === "Low";
  const moderateGrossMargin = grossMargin?.status === "Moderate";

  if (runway?.status === "High Risk") {
    tags.push("runway-risk", "financing-dependency");
  } else if (runway?.status === "Moderate") {
    tags.push("financing-dependency");
  }

  if (sensitivity?.status === "High Sensitivity") {
    tags.push("financing-risk");
  }

  if (spendsAboveRevenue) {
    tags.push("high-burn");
  }

  if (lowGrossMargin || spendsAboveRevenue) {
    tags.push("weak-capital-efficiency");
  }

  if (spendsAboveRevenue && (lowGrossMargin || moderateGrossMargin)) {
    tags.push("capital-intensive");
  }

  const elevatedFinancingNeed =
    runway?.status === "High Risk" || runway?.status === "Moderate";
  if (growth?.status === "Strong" && (spendsAboveRevenue || elevatedFinancingNeed)) {
    tags.push("aggressive-growth");
  }

  return uniqueTags(tags);
}
