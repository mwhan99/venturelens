import benchmarks from "@/data/formd/benchmarks.json";

// The odds explorer's choices and data. Everything comes from benchmarks.json
// (pipeline/analyze.py). The data is split one way at a time: a sector can be
// combined with a round size or with a stage, but not both.

export const SECTORS = [
  { slug: "all", label: "All startups", key: null },
  { slug: "technology", label: "Technology", key: "Technology" },
  { slug: "healthtech", label: "HealthTech/Biotech", key: "HealthTech/Biotech" },
  { slug: "fintech", label: "FinTech", key: "FinTech" },
  { slug: "climate", label: "Energy/ClimateTech", key: "Energy/ClimateTech" },
  { slug: "consumer", label: "Consumer", key: "Consumer" },
  { slug: "other", label: "Other/Unclassified", key: "Other/Unclassified" },
] as const;

export const SIZES = [
  { slug: "under-1m", label: "Under $1M", key: "<$1M" },
  { slug: "1-5m", label: "$1–5M", key: "$1–5M" },
  { slug: "5-20m", label: "$5–20M", key: "$5–20M" },
  { slug: "20m-plus", label: "$20M+", key: "$20M+" },
] as const;

export const STAGES = [
  { slug: "1", label: "First round seen", key: "1" },
  { slug: "2", label: "Second", key: "2" },
  { slug: "3-plus", label: "Third or later", key: "3+" },
] as const;

export const MILESTONES = [6, 12, 18, 24, 36] as const;

export type Selection = {
  sector: (typeof SECTORS)[number]["slug"];
  size: (typeof SIZES)[number]["slug"] | null;
  stage: (typeof STAGES)[number]["slug"] | null;
};

export const DEFAULT_SELECTION: Selection = { sector: "technology", size: null, stage: null };

export type Segment = {
  rounds: number;
  filedAgain: number;
  /** Months 1–36; null when the group is too small to estimate. */
  curve: number[] | null;
  gap: number | null;
};

type Raw = {
  n_rounds: number;
  n_events: number;
  status: string;
  conditional_median_months: number | null;
  probability_another_filing_by_month: object | null;
};

function toSegment(raw: Raw | undefined): Segment | null {
  if (!raw) return null;
  const probs = raw.probability_another_filing_by_month as Record<string, number | null> | null;
  const curve =
    raw.status === "ok" && probs ? benchmarks.probability_months.map((m) => probs[String(m)] ?? 0) : null;
  return { rounds: raw.n_rounds, filedAgain: raw.n_events, curve, gap: raw.conditional_median_months };
}

export function key(selection: Selection): string {
  return `${selection.sector}|${selection.size ?? ""}|${selection.stage ?? ""}`;
}

/** Every group the explorer can show, keyed by key(selection). Small enough to send to the browser. */
export function getSegments(): Record<string, Segment> {
  const out: Record<string, Segment> = {};
  const put = (selection: Selection, raw: Raw | undefined) => {
    const segment = toSegment(raw);
    if (segment) out[key(selection)] = segment;
  };
  put({ sector: "all", size: null, stage: null }, benchmarks.overall);
  for (const size of SIZES) {
    put({ sector: "all", size: size.slug, stage: null }, benchmarks.by_amount_bucket.find((b) => b.amount_bucket === size.key));
  }
  for (const stage of STAGES) {
    put({ sector: "all", size: null, stage: stage.slug }, benchmarks.by_stage.find((b) => b.stage === stage.key));
  }
  for (const sector of SECTORS.filter((s) => s.key)) {
    const match = (b: { venture_sector: string | null }) => b.venture_sector === sector.key;
    put({ sector: sector.slug, size: null, stage: null }, benchmarks.by_sector.find(match));
    for (const size of SIZES) {
      put(
        { sector: sector.slug, size: size.slug, stage: null },
        benchmarks.by_sector_and_amount_bucket.find((b) => match(b) && b.amount_bucket === size.key),
      );
    }
    for (const stage of STAGES) {
      put(
        { sector: sector.slug, size: null, stage: stage.slug },
        benchmarks.by_sector_and_stage.find((b) => match(b) && b.stage === stage.key),
      );
    }
  }
  return out;
}

/** Read a selection from the address. Unknown values fall back to the default; a size wins over a stage. */
export function parseSelection(params: { get(name: string): string | null }): Selection {
  const sector = SECTORS.find((s) => s.slug === params.get("sector"))?.slug ?? DEFAULT_SELECTION.sector;
  const size = SIZES.find((s) => s.slug === params.get("size"))?.slug ?? null;
  const stage = size ? null : (STAGES.find((s) => s.slug === params.get("stage"))?.slug ?? null);
  return { sector, size, stage };
}

export function toQuery(selection: Selection): string {
  const params = new URLSearchParams({ sector: selection.sector });
  if (selection.size) params.set("size", selection.size);
  if (selection.stage) params.set("stage", selection.stage);
  return params.toString();
}

/** "FinTech rounds of $1–5M", "All startups' first rounds seen", … */
export function describe(selection: Selection): string {
  const sector = SECTORS.find((s) => s.slug === selection.sector)!;
  const who = sector.slug === "all" ? "startup rounds" : `${sector.label} rounds`;
  if (selection.size) {
    const size = SIZES.find((s) => s.slug === selection.size)!;
    return size.slug === "under-1m" ? `${who} under $1M` : size.slug === "20m-plus" ? `${who} of $20M or more` : `${who} of ${size.label}`;
  }
  if (selection.stage) {
    const ordinal = { "1": "first", "2": "second", "3-plus": "third or later" }[selection.stage];
    return `${who} that were a company’s ${ordinal} round in the data`;
  }
  return sector.slug === "all" ? "all startup rounds" : who;
}

export const MIN_GAP_MONTHS = benchmarks.min_gap_months;
export const DATASET_END = benchmarks.dataset_end_date;
