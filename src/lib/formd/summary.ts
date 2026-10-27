import benchmarks from "@/data/formd/benchmarks.json";
import summary from "@/data/formd/summary.json";

// Everything the home page shows about Form D comes from these two generated
// files (pipeline/summarize.py and pipeline/analyze.py). Never type a number
// into a page; add it here, computed from the data.

export const AMOUNT_BUCKETS = ["<$1M", "$1–5M", "$5–20M", "$20M+"] as const;
export type Bucket = (typeof AMOUNT_BUCKETS)[number];

type Curve = Record<string, number>;

export type YearPoint = { year: number; rounds: number; median: number; partial: boolean };
export type SectorPoint = { name: string; p24: number; gap: number; rounds: number };

export function pct(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function count(value: number): string {
  return value.toLocaleString("en-US");
}

export function money(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "")}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
  }
  return `$${count(value)}`;
}

export function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function curveValues(curve: Curve): number[] {
  return benchmarks.probability_months.map((month) => curve[String(month)]);
}

function at24(curve: Curve): number {
  return curve["24"];
}

export function getHomeData() {
  const head = summary.headline;
  const years: YearPoint[] = summary.by_year.map((y) => ({
    year: y.year,
    rounds: y.rounds,
    median: y.median_amount_sold,
    partial: y.partial,
  }));
  const sectors: SectorPoint[] = benchmarks.by_sector
    .map((s) => ({
      name: s.venture_sector,
      p24: at24(s.probability_another_filing_by_month as Curve),
      gap: s.conditional_median_months,
      rounds: s.n_rounds,
    }))
    .sort((a, b) => b.p24 - a.p24);
  const technology = benchmarks.by_sector.find((s) => s.venture_sector === "Technology");
  if (!technology) throw new Error("benchmarks.json has no Technology sector");

  return {
    endDate: benchmarks.dataset_end_date,
    minGap: benchmarks.min_gap_months,
    rounds: head.rounds,
    companies: head.companies,
    medianRound: head.median_amount_sold,
    firstYear: head.first_year,
    lastYear: head.last_year,
    filers: summary.funnel[0].companies,
    funnel: summary.funnel.map((f) => ({ step: f.step, companies: f.companies })),
    overall: {
      p24: at24(benchmarks.overall.probability_another_filing_by_month as Curve),
      gap: benchmarks.overall.conditional_median_months,
      curve: curveValues(benchmarks.overall.probability_another_filing_by_month as Curve),
    },
    technologyCurve: curveValues(technology.probability_another_filing_by_month as Curve),
    years,
    sectors,
  };
}

export type HomeData = ReturnType<typeof getHomeData>;

/** The odds picker's table: 24-month rate, typical gap and rounds for each sector and size. */
export function getOddsTable() {
  const cell = (s: {
    n_rounds: number;
    conditional_median_months: number | null;
    probability_another_filing_by_month: object | null;
    status: string;
  }) =>
    s.status === "ok" && s.probability_another_filing_by_month
      ? {
          p24: at24(s.probability_another_filing_by_month as Curve),
          gap: s.conditional_median_months,
          rounds: s.n_rounds,
        }
      : null;
  return benchmarks.by_sector.map((s) => ({
    sector: s.venture_sector,
    all: cell(s),
    buckets: Object.fromEntries(
      AMOUNT_BUCKETS.map((bucket) => [
        bucket,
        cell(
          benchmarks.by_sector_and_amount_bucket.find(
            (b) => b.venture_sector === s.venture_sector && b.amount_bucket === bucket,
          ) ?? { n_rounds: 0, conditional_median_months: null, probability_another_filing_by_month: null, status: "missing" },
        ),
      ]),
    ) as Record<Bucket, ReturnType<typeof cell>>,
  }));
}

export type OddsTable = ReturnType<typeof getOddsTable>;

/** Key findings as sentences generated from the data, so they stay true after a refresh. */
export function findings(data: HomeData = getHomeData()) {
  const fullYears = data.years.filter((y) => !y.partial);
  const peak = fullYears.reduce((a, y) => (y.rounds > a.rounds ? y : a));
  const latest = fullYears[fullYears.length - 1];
  const change = latest.rounds / peak.rounds - 1;

  const tech = getOddsTable().find((row) => row.sector === "Technology");
  const sized = AMOUNT_BUCKETS.map((bucket) => ({ bucket, cell: tech?.buckets[bucket] })).filter(
    (b): b is { bucket: Bucket; cell: NonNullable<typeof b.cell> } => Boolean(b.cell),
  );
  const best = sized.reduce((a, b) => (b.cell.p24 > a.cell.p24 ? b : a));
  const smallest = sized[0];

  const top = data.sectors[0];
  const bottom = data.sectors[data.sectors.length - 1];

  return [
    {
      figure: pct(1 - data.overall.p24),
      text: "of rounds have no further Form D filing within two years. Many of those companies raised in ways Form D doesn’t record.",
    },
    {
      figure: `${data.overall.gap.toFixed(1)} mo`,
      text: "is the typical wait when a startup does file again, and it’s close to that in every sector.",
    },
    {
      figure: pct(best.cell.p24),
      text: `of ${best.bucket} Technology rounds filed again within 24 months, the most of any round size. Under $1M: ${pct(smallest.cell.p24)}.`,
    },
    {
      figure: `${Math.abs(Math.round(change * 100))}%`,
      text: `${change < 0 ? "fewer" : "more"} rounds in ${latest.year} than in ${peak.year}, the peak year (${count(latest.rounds)} against ${count(peak.rounds)}).`,
    },
    {
      figure: pct(top.p24),
      text: `for ${top.name}, the sector most likely to file again within 24 months. ${bottom.name} is lowest at ${pct(bottom.p24)}.`,
    },
  ];
}
