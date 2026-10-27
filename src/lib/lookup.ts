import { SECTORS } from "@/lib/formd/explorer";

// The company lookup reads from Supabase (tables in supabase/schema.sql,
// filled by pipeline/supabase_sync.py) with the read-only publishable key.
// It runs only on the server: the key has no NEXT_PUBLIC_ prefix, so it never
// reaches the browser. Answers are cached for an hour; the data changes only
// when the pipeline is re-run.

const REVALIDATE_SECONDS = 3600;
export const MAX_QUERY_LENGTH = 80;

export type BenchmarkStatus =
  | "benchmark"
  | "likely_non_startup"
  | "not_young"
  | "non_venture_industry"
  | "no_completed_round"
  | "other_legal_form";

export type SearchHit = {
  cik: string;
  name: string;
  matched_name: string;
  state: string | null;
  industry: string | null;
  round_count: number;
  benchmark_status: BenchmarkStatus;
};

export type Filer = {
  cik: string;
  name: string;
  state: string | null;
  industry: string | null;
  venture_sector: string | null;
  first_event_date: string | null;
  last_event_date: string | null;
  round_count: number;
  completed_round_count: number;
  benchmark_status: BenchmarkStatus;
  status_detail: string | null;
};

export type Round = {
  round_number: number;
  event_date: string;
  event_date_source: string | null;
  amount_sold: number | null;
  investor_count: number | null;
  industry: string | null;
  revenue_range: string | null;
  months_since_previous: number | null;
  months_to_next: number | null;
  n_offerings: number | null;
};

export type FilerName = { name: string; source: "filing" | "brand" };

export const STATUS_LABEL: Record<BenchmarkStatus, { short: string; long: string; counted: boolean }> = {
  benchmark: { short: "In the benchmark", long: "Counted in the VentureLens benchmark.", counted: true },
  likely_non_startup: { short: "Excluded: likely not a startup", long: "Filed like a startup, but looks like something else.", counted: false },
  not_young: { short: "Not counted: not a young company", long: "Already established when it first appears in this data.", counted: false },
  non_venture_industry: { short: "Not counted: outside venture sectors", long: "Its industry isn't one of the six venture sectors.", counted: false },
  no_completed_round: { short: "Not counted: nothing sold", long: "It never reported selling anything.", counted: false },
  other_legal_form: { short: "Not counted: legal form", long: "It isn't a corporation or LLC.", counted: false },
};

/** A CIK is the SEC's 10-digit company ID. Anything else in the address is not a company page. */
export function parseCik(value: string): string | null {
  return /^\d{10}$/.test(value) ? value : null;
}

/** The search text from the address: trimmed, one value, at most MAX_QUERY_LENGTH characters. */
export function parseQuery(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
}

/** The explorer link for a benchmark company's sector, e.g. /explore?sector=fintech. */
export function explorerHrefForSector(sector: string | null): string | null {
  if (!sector) return null; // "All startups" also has no sector key; don't match it
  const slug = SECTORS.find((s) => s.key === sector)?.slug;
  return slug ? `/explore?sector=${slug}` : null;
}

export function edgarUrl(cik: string): string {
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=D&dateb=&owner=include&count=40`;
}

function settings() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are not set (.env.local locally, Environment Variables on Vercel).");
  }
  return { url, key };
}

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const { url, key } = settings();
  const response = await fetch(`${url}/rest/v1/${path}?${new URLSearchParams(params)}`, {
    headers: { apikey: key, Accept: "application/json" },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!response.ok) {
    throw new Error(`Supabase ${path} answered ${response.status}`);
  }
  return (await response.json()) as T;
}

/**
 * search_filers scores an exact name 3, a name that starts with the search 2+,
 * and a close spelling below 2. Within each of those groups, put companies with
 * more rounds first, so "ramp" shows Ramp Business Corp (11 rounds) before a
 * one-filing "RAMp Sports LLC".
 */
export function rankHits<T extends { score: number; round_count: number }>(hits: T[]): T[] {
  const tier = (h: T) => (h.score >= 3 ? 3 : h.score >= 2 ? 2 : 1);
  return [...hits].sort((a, b) => tier(b) - tier(a) || b.round_count - a.round_count || b.score - a.score);
}

export async function searchFilers(query: string, limit = 20): Promise<SearchHit[]> {
  if (query.length < 2) return [];
  // search_filers is a read-only ("stable") function, so it can be called with GET and cached.
  // Ask for the database's top 50, then re-rank and keep `limit`.
  const hits = await get<(SearchHit & { score: number })[]>("rpc/search_filers", { query, max_results: "50" });
  return rankHits(hits).slice(0, limit);
}

export async function getFiler(cik: string): Promise<Filer | null> {
  const rows = await get<Filer[]>("filers", { cik: `eq.${cik}`, select: "*", limit: "1" });
  return rows[0] ?? null;
}

export async function getRounds(cik: string): Promise<Round[]> {
  return get<Round[]>("rounds", {
    cik: `eq.${cik}`,
    select:
      "round_number,event_date,event_date_source,amount_sold,investor_count,industry,revenue_range,months_since_previous,months_to_next,n_offerings",
    order: "round_number.asc",
  });
}

export async function getNames(cik: string): Promise<FilerName[]> {
  return get<FilerName[]>("filer_names", { cik: `eq.${cik}`, select: "name,source", order: "source.asc,name.asc" });
}
