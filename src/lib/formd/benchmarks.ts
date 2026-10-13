import benchmarks from "@/data/formd/benchmarks.json";
import { industries } from "@/data/form-options";

export type FormDSector =
  | "Technology"
  | "HealthTech/Biotech"
  | "FinTech"
  | "Energy/ClimateTech"
  | "Consumer"
  | "Other/Unclassified";

/**
 * App industry labels are not Form D industry groups. This map is the
 * screening vocabulary → VentureLens sector used in benchmarks.json.
 * An industry that is not in the form list uses Other/Unclassified.
 */
const INDUSTRY_TO_SECTOR = {
  FinTech: "FinTech",
  SaaS: "Technology",
  AI: "Technology",
  Cybersecurity: "Technology",
  LegalTech: "Technology",
  LogisticsTech: "Technology",
  HealthTech: "HealthTech/Biotech",
  ClimateTech: "Energy/ClimateTech",
  FoodTech: "Consumer",
  Consumer: "Consumer",
  Other: "Other/Unclassified",
} as const satisfies Record<(typeof industries)[number], FormDSector>;

const AMOUNT_BUCKETS = ["<$1M", "$1–5M", "$5–20M", "$20M+"] as const;

export type AmountBucket = (typeof AMOUNT_BUCKETS)[number];

export type FinancingBenchmarkInput = {
  industry: string;
  investmentAmount: number;
  runwayMonths: number;
};

export type FinancingBenchmark = {
  sector: FormDSector;
  bucket: AmountBucket;
  nRounds: number;
  probabilityWithinRunway: number | null;
  conditionalMedianMonths: number | null;
  tone: "caution" | "neutral";
  usedFallback: boolean;
  runwayMonths: number;
  /** Month index used for the probability. Null when runway is under the merge floor. */
  lookupMonths: number | null;
};

type Segment = {
  venture_sector: string | null;
  amount_bucket: string | null;
  n_rounds: number;
  status: string;
  conditional_median_months: number | null;
  probability_another_filing_by_month: Record<string, number> | null;
};

const MAX_LOOKUP_MONTH = 36;

function isFormDSector(value: string): value is FormDSector {
  return (Object.values(INDUSTRY_TO_SECTOR) as string[]).includes(value);
}

export function sectorForIndustry(industry: string): FormDSector {
  const mapped = INDUSTRY_TO_SECTOR[industry as keyof typeof INDUSTRY_TO_SECTOR];
  return mapped ?? "Other/Unclassified";
}

/**
 * investmentAmount is the investor's check, used as a proxy for round size.
 * Boundaries match the Form D amount buckets: under $1M, $1–5M, $5–20M, $20M+.
 */
export function amountBucketForInvestment(investmentAmount: number): AmountBucket {
  if (investmentAmount < 1_000_000) {
    return "<$1M";
  }
  if (investmentAmount < 5_000_000) {
    return "$1–5M";
  }
  if (investmentAmount < 20_000_000) {
    return "$5–20M";
  }
  return "$20M+";
}

function asSegment(entry: {
  venture_sector: string | null;
  amount_bucket: string | null;
  n_rounds: number;
  status: string;
  conditional_median_months: number | null;
  probability_another_filing_by_month: object | null;
}): Segment {
  return {
    ...entry,
    probability_another_filing_by_month:
      entry.probability_another_filing_by_month as Record<string, number> | null,
  };
}

function segmentIsUsable(segment: Segment | undefined): segment is Segment {
  return (
    segment !== undefined &&
    segment.status === "ok" &&
    segment.probability_another_filing_by_month !== null
  );
}

/**
 * Comparable rounds are sector × amount bucket. The app's Stage field is not
 * used: Form D observed_round_number counts filings in the extract, not seed
 * or Series A.
 */
export function getFinancingBenchmark(
  company: FinancingBenchmarkInput,
): FinancingBenchmark {
  const sector = sectorForIndustry(company.industry);
  if (!isFormDSector(sector)) {
    throw new Error(`Unmapped Form D sector: ${sector}`);
  }
  const bucket = amountBucketForInvestment(company.investmentAmount);
  const amountMatch = benchmarks.by_sector_and_amount_bucket
    .map(asSegment)
    .find(
      (entry) => entry.venture_sector === sector && entry.amount_bucket === bucket,
    );
  const sectorMatch = benchmarks.by_sector
    .map(asSegment)
    .find((entry) => entry.venture_sector === sector);
  const overall = asSegment(benchmarks.overall);

  let segment: Segment;
  let usedFallback: boolean;
  if (segmentIsUsable(amountMatch)) {
    segment = amountMatch;
    usedFallback = false;
  } else if (segmentIsUsable(sectorMatch)) {
    segment = sectorMatch;
    usedFallback = true;
  } else {
    segment = overall;
    usedFallback = true;
  }

  const runwayMonths = company.runwayMonths;
  let lookupMonths: number | null = null;
  let probabilityWithinRunway: number | null = null;
  if (runwayMonths >= benchmarks.min_gap_months) {
    lookupMonths = Math.min(MAX_LOOKUP_MONTH, Math.max(1, Math.round(runwayMonths)));
    const probability = segment.probability_another_filing_by_month?.[String(lookupMonths)];
    probabilityWithinRunway = typeof probability === "number" ? probability : null;
  }

  const conditionalMedianMonths = segment.conditional_median_months;
  const tone =
    conditionalMedianMonths !== null && runwayMonths < conditionalMedianMonths
      ? "caution"
      : "neutral";

  return {
    sector,
    bucket,
    nRounds: segment.n_rounds,
    probabilityWithinRunway,
    conditionalMedianMonths,
    tone,
    usedFallback,
    runwayMonths,
    lookupMonths,
  };
}

export type FinancingBenchmarkCopy = {
  headline: string;
  median: string | null;
  caution: string | null;
  footnote: string;
};

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatGapMonths(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function horizonLabel(months: number): string {
  return months === 1 ? "1 month" : `${months} months`;
}

export function formatFinancingBenchmark(
  benchmark: FinancingBenchmark,
): FinancingBenchmarkCopy {
  const comparable = benchmark.usedFallback
    ? `${benchmark.sector} rounds`
    : `${benchmark.sector}, ${benchmark.bucket} rounds`;

  let headline: string;
  if (
    benchmark.runwayMonths < benchmarks.min_gap_months ||
    benchmark.probabilityWithinRunway === null ||
    benchmark.lookupMonths === null
  ) {
    headline = "Under 3 months: not measurable with this data.";
  } else {
    const horizon =
      benchmark.runwayMonths > MAX_LOOKUP_MONTH
        ? MAX_LOOKUP_MONTH
        : benchmark.lookupMonths;
    const percent = Math.round(benchmark.probabilityWithinRunway * 100);
    headline = `Of ${formatCount(benchmark.nRounds)} comparable ${comparable}, ${percent}% were followed by another Form D filing within ${horizonLabel(horizon)}.`;
  }

  const median =
    benchmark.conditionalMedianMonths === null
      ? null
      : `Among rounds that were followed by another filing, the median gap was ${formatGapMonths(benchmark.conditionalMedianMonths)} months.`;

  const caution =
    benchmark.tone === "caution"
      ? "Runway is shorter than the typical gap between filings for comparable companies."
      : null;

  const footnote = `Based on ${formatCount(benchmarks.counts.rounds)} SEC Form D rounds through ${benchmarks.dataset_end_date}. A new filing is a lower bound on fundraising; SAFEs, notes, and some rounds don't appear.`;

  return { headline, median, caution, footnote };
}

/** One sentence for the memo when the existing runway flag is caution. */
export function financingBenchmarkSummarySentence(
  benchmark: FinancingBenchmark,
): string {
  if (
    benchmark.probabilityWithinRunway === null ||
    benchmark.lookupMonths === null ||
    benchmark.runwayMonths < benchmarks.min_gap_months
  ) {
    return "Under 3 months: not measurable with this data.";
  }

  const horizon =
    benchmark.runwayMonths > MAX_LOOKUP_MONTH ? MAX_LOOKUP_MONTH : benchmark.lookupMonths;
  const percent = Math.round(benchmark.probabilityWithinRunway * 100);
  return `Only ${percent}% of comparable rounds were followed by another filing within ${horizonLabel(horizon)}.`;
}
