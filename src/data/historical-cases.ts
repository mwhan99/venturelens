export const QUANTITATIVE_RISK_TAGS = [
  "high-burn",
  "aggressive-growth",
  "financing-dependency",
  "weak-capital-efficiency",
  "runway-risk",
  "capital-intensive",
  "persistent-losses",
  "financing-risk",
] as const;

export const QUALITATIVE_RISK_TAGS = [
  "governance",
  "disclosure-risk",
  "diligence-risk",
] as const;

export type QuantitativeRiskTag = (typeof QUANTITATIVE_RISK_TAGS)[number];
export type QualitativeRiskTag = (typeof QUALITATIVE_RISK_TAGS)[number];
export type RiskTag = QuantitativeRiskTag | QualitativeRiskTag;

export type HistoricalCaseMatchMode = "quantitative" | "qualitative-diligence";

export type HistoricalCase = {
  id: string;
  companyName: string;
  primaryRiskPattern: string;
  riskTags: readonly RiskTag[];
  matchMode: HistoricalCaseMatchMode;
  summary: string;
  sourceLabel: string;
  sourceUrl: string | null;
  diligenceQuestions: readonly string[];
};

export const RISK_TAG_LABELS: Record<RiskTag, string> = {
  "high-burn": "High burn",
  "aggressive-growth": "Aggressive growth",
  "financing-dependency": "Financing dependency",
  "weak-capital-efficiency": "Weak capital efficiency",
  "runway-risk": "Runway risk",
  "capital-intensive": "Capital-intensive",
  "persistent-losses": "Persistent losses",
  "financing-risk": "Financing risk",
  governance: "Governance",
  "disclosure-risk": "Disclosure risk",
  "diligence-risk": "Diligence risk",
};

export const RISK_TAG_SIMILARITY: Record<QuantitativeRiskTag, string> = {
  "high-burn":
    "Both profiles show spending that is large relative to current revenue.",
  "aggressive-growth":
    "Both profiles show rapid top-line expansion alongside elevated capital needs.",
  "financing-dependency":
    "Both profiles indicate continued reliance on external financing to fund operations.",
  "weak-capital-efficiency":
    "Both profiles show weaker capital-efficiency or unit-economics signals in the screening data.",
  "runway-risk":
    "Both profiles show limited cash runway relative to current burn.",
  "capital-intensive":
    "Both profiles show a capital-intensive operating pattern in the available screening signals.",
  "persistent-losses":
    "Both profiles show current spending in excess of current revenue.",
  "financing-risk":
    "Both profiles show returns that are highly sensitive to financing, growth, or exit assumptions.",
};

export const historicalCases: readonly HistoricalCase[] = [
  {
    id: "wework",
    companyName: "WeWork",
    primaryRiskPattern: "Hypergrowth / High Burn",
    riskTags: ["high-burn", "aggressive-growth", "financing-dependency"],
    matchMode: "quantitative",
    summary:
      "WeWork expanded rapidly while generating substantial losses. Its 2019 S-1 reported a net loss attributable to WeWork Companies Inc. of approximately $1.6 billion for 2018.",
    sourceLabel: "SEC WeWork S-1",
    sourceUrl:
      "https://www.sec.gov/Archives/edgar/data/1533523/000119312519220499/d781982ds1.htm",
    diligenceQuestions: [
      "How is growth being funded relative to current revenue and cash generation?",
      "What operating losses are being incurred to support expansion, and over what time horizon?",
      "How dependent is the plan on continued access to external capital?",
    ],
  },
  {
    id: "fast",
    companyName: "Fast",
    primaryRiskPattern: "Burn vs. Revenue / Capital Efficiency",
    riskTags: ["high-burn", "weak-capital-efficiency", "financing-dependency"],
    matchMode: "quantitative",
    summary:
      "Fast shut down in 2022 after rapid spending and limited revenue. TechCrunch reported that the company generated six-figure revenue in 2021 while its burn rate was reported to be as high as $10 million per month.",
    sourceLabel: "TechCrunch",
    sourceUrl:
      "https://techcrunch.com/2022/04/05/fast-shuts-doors-after-slow-growth-high-burn-precluded-fundraising-options/",
    diligenceQuestions: [
      "What is the relationship between current burn and current revenue?",
      "Which expenses are variable with growth versus fixed regardless of traction?",
      "If fundraising slowed, how long could the company operate on existing cash?",
    ],
  },
  {
    id: "airlift",
    companyName: "Airlift",
    primaryRiskPattern: "Financing Dependency / Runway",
    riskTags: ["financing-dependency", "runway-risk", "capital-intensive"],
    matchMode: "quantitative",
    summary:
      "Airlift shut down in 2022 after an attempted financing round was unsuccessful. The company said it had reduced financial burn by 66% and was approaching operating profitability, illustrating how financing availability can remain critical even as operating performance improves.",
    sourceLabel: "TechCrunch",
    sourceUrl: "https://techcrunch.com/2022/07/12/airlift-shutdown/",
    diligenceQuestions: [
      "What is the cash runway under the current burn rate?",
      "Which near-term financing events does the operating plan assume will close?",
      "If a round is delayed or unsuccessful, what contingency exists for operations?",
    ],
  },
  {
    id: "bird",
    companyName: "Bird",
    primaryRiskPattern: "Capital-Intensive Growth / Persistent Losses",
    riskTags: ["capital-intensive", "persistent-losses", "financing-risk"],
    matchMode: "quantitative",
    summary:
      "Bird operated a capital-intensive micromobility model and experienced substantial losses before entering Chapter 11 proceedings in 2023.",
    sourceLabel: "SEC filings / Chapter 11 disclosure",
    sourceUrl: null,
    diligenceQuestions: [
      "How much ongoing capital is required to maintain or grow the current operating model?",
      "Are losses expected to persist as scale increases, or are they concentrated in a defined investment period?",
      "How sensitive are investor outcomes to changes in financing conditions or exit assumptions?",
    ],
  },
  {
    id: "theranos",
    companyName: "Theranos",
    primaryRiskPattern: "Governance / Disclosure / Due Diligence",
    riskTags: ["governance", "disclosure-risk", "diligence-risk"],
    matchMode: "qualitative-diligence",
    summary:
      "The SEC charged Theranos, Elizabeth Holmes, and Ramesh Balwani in 2018 in connection with alleged false or exaggerated statements about the company's technology, business, and financial performance while raising more than $700 million from investors.",
    sourceLabel: "SEC",
    sourceUrl: "https://www.sec.gov/enforcement-litigation/litigation-releases/lr-24069",
    diligenceQuestions: [
      "What independent evidence supports claims about the product, technology, and financial performance?",
      "How are material risks and limitations disclosed to investors?",
      "What governance and verification processes exist around fundraising representations?",
    ],
  },
];
