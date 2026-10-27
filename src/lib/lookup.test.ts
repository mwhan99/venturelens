import { afterEach, describe, expect, it, vi } from "vitest";
import { SECTORS } from "@/lib/formd/explorer";
import { STATUS_LABEL, edgarUrl, explorerHrefForSector, getFiler, parseCik, parseQuery, rankHits, searchFilers } from "@/lib/lookup";

describe("reading the address", () => {
  it("accepts only 10-digit SEC IDs", () => {
    expect(parseCik("0001579878")).toBe("0001579878");
    expect(parseCik("1579878")).toBeNull();
    expect(parseCik("0001579878;drop")).toBeNull();
    expect(parseCik("../secrets")).toBeNull();
  });

  it("cleans the search text", () => {
    expect(parseQuery("  warby   parker ")).toBe("warby parker");
    expect(parseQuery(["figma", "ramp"])).toBe("figma");
    expect(parseQuery(undefined)).toBe("");
    expect(parseQuery("x".repeat(200))).toHaveLength(80);
  });
});

describe("ranking", () => {
  it("keeps exact and starts-with matches first, then prefers companies with more rounds", () => {
    const hits = [
      { name: "RAMp Sports LLC", score: 2.31, round_count: 3 },
      { name: "Ramp Business Corp", score: 2.2, round_count: 11 },
      { name: "Tramp Inc", score: 0.4, round_count: 40 },
      { name: "Ramp", score: 3, round_count: 1 },
    ];
    expect(rankHits(hits).map((h) => h.name)).toEqual(["Ramp", "Ramp Business Corp", "RAMp Sports LLC", "Tramp Inc"]);
  });
});

describe("labels and links", () => {
  it("has a label for every status the database can return", () => {
    for (const status of ["benchmark", "likely_non_startup", "not_young", "non_venture_industry", "no_completed_round", "other_legal_form"] as const) {
      expect(STATUS_LABEL[status].short.length).toBeGreaterThan(0);
    }
    expect(Object.values(STATUS_LABEL).filter((s) => s.counted)).toHaveLength(1);
  });

  it("links every benchmark sector to the explorer", () => {
    for (const sector of SECTORS.filter((s) => s.key)) {
      expect(explorerHrefForSector(sector.key)).toBe(`/explore?sector=${sector.slug}`);
    }
    expect(explorerHrefForSector(null)).toBeNull();
    expect(edgarUrl("0001579878")).toContain("CIK=0001579878");
  });
});

describe("talking to Supabase", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses the read-only key and asks for the company by exact ID", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co/");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ cik: "0001579878", name: "Figma, Inc." }])));
    vi.stubGlobal("fetch", fetchMock);
    const filer = await getFiler("0001579878");
    expect(filer?.name).toBe("Figma, Inc.");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://example.supabase.co/rest/v1/filers?cik=eq.0001579878&select=*&limit=1");
    expect(init.headers.apikey).toBe("sb_publishable_test");
    expect(init.next.revalidate).toBe(3600);
  });

  it("doesn't call Supabase for a one-letter search", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await searchFilers("f")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("says clearly when the settings are missing", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "");
    await expect(getFiler("0001579878")).rejects.toThrow(/SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY/);
  });
});
