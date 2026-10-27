import { describe, expect, it } from "vitest";
import benchmarks from "@/data/formd/benchmarks.json";
import { SECTORS, SIZES, STAGES, describe as describeSelection, getSegments, key, parseSelection, toQuery } from "@/lib/formd/explorer";

const params = (query: string) => new URLSearchParams(query);

describe("explorer segments", () => {
  const segments = getSegments();

  it("has every sector with every size and stage, including all sectors together", () => {
    for (const sector of SECTORS) {
      expect(segments[key({ sector: sector.slug, size: null, stage: null })]).toBeDefined();
      for (const size of SIZES) expect(segments[key({ sector: sector.slug, size: size.slug, stage: null })]).toBeDefined();
      for (const stage of STAGES) expect(segments[key({ sector: sector.slug, size: null, stage: stage.slug })]).toBeDefined();
    }
    expect(Object.keys(segments)).toHaveLength(SECTORS.length * (1 + SIZES.length + STAGES.length));
  });

  it("reads Technology at 24 months as 37.6% (the step 7 check)", () => {
    expect(segments[key({ sector: "technology", size: null, stage: null })].curve?.[23]).toBe(0.376);
  });

  it("matches benchmarks.json for all startups and a stage", () => {
    const all = segments[key({ sector: "all", size: null, stage: null })];
    expect(all.rounds).toBe(benchmarks.counts.rounds);
    expect(all.curve?.[23]).toBe(benchmarks.overall.probability_another_filing_by_month["24"]);
    const third = benchmarks.by_stage.find((s) => s.stage === "3+");
    expect(segments[key({ sector: "all", size: null, stage: "3-plus" })].curve?.[23]).toBe(
      third?.probability_another_filing_by_month?.["24"],
    );
  });

  it("splits all startups into sizes that add up to the total", () => {
    const total = SIZES.reduce((sum, s) => sum + segments[key({ sector: "all", size: s.slug, stage: null })].rounds, 0);
    expect(total).toBe(benchmarks.counts.rounds);
  });
});

describe("the address", () => {
  it("defaults to Technology when there is nothing or something unknown", () => {
    expect(parseSelection(params(""))).toEqual({ sector: "technology", size: null, stage: null });
    expect(parseSelection(params("sector=javascript:alert(1)&size=huge"))).toEqual({ sector: "technology", size: null, stage: null });
  });

  it("keeps a size over a stage when both are given", () => {
    expect(parseSelection(params("sector=fintech&size=1-5m&stage=2"))).toEqual({ sector: "fintech", size: "1-5m", stage: null });
  });

  it("round-trips through toQuery", () => {
    const selection = { sector: "consumer", size: null, stage: "3-plus" } as const;
    expect(parseSelection(params(toQuery(selection)))).toEqual(selection);
  });

  it("describes a selection in words", () => {
    expect(describeSelection({ sector: "fintech", size: "under-1m", stage: null })).toBe("FinTech rounds under $1M");
    expect(describeSelection({ sector: "all", size: null, stage: null })).toBe("all startup rounds");
  });
});
