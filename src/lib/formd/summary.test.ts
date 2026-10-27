import { describe, expect, it } from "vitest";
import benchmarks from "@/data/formd/benchmarks.json";
import summary from "@/data/formd/summary.json";
import { findings, getHomeData, getOddsTable, longDate, money, pct } from "@/lib/formd/summary";

describe("home page data", () => {
  const data = getHomeData();

  it("comes straight from the generated files", () => {
    expect(data.rounds).toBe(summary.headline.rounds);
    expect(data.companies).toBe(summary.headline.companies);
    expect(data.filers).toBe(summary.funnel[0].companies);
    expect(data.funnel.at(-1)?.companies).toBe(summary.headline.companies);
    expect(data.overall.p24).toBe(benchmarks.overall.probability_another_filing_by_month["24"]);
    expect(data.overall.curve).toHaveLength(36);
    expect(data.years.map((y) => y.year)).toEqual(summary.by_year.map((y) => y.year));
  });

  it("sorts sectors from most to least likely to file again", () => {
    const rates = data.sectors.map((s) => s.p24);
    expect(rates).toEqual([...rates].sort((a, b) => b - a));
    expect(data.sectors).toHaveLength(benchmarks.by_sector.length);
  });

  it("writes one finding per headline fact, with its figure from the data", () => {
    const list = findings(data);
    expect(list).toHaveLength(5);
    expect(list[0].figure).toBe(pct(1 - data.overall.p24));
    expect(list[4].text).toContain(data.sectors[0].name);
    expect(list[4].text).toContain(data.sectors.at(-1)!.name);
  });

  it("does not count the partial year as the peak", () => {
    const peakText = findings(data)[3].text;
    const partial = data.years.find((y) => y.partial);
    if (partial) expect(peakText).not.toContain(`in ${partial.year},`);
  });
});

describe("odds picker table", () => {
  it("matches benchmarks.json for one sector and size", () => {
    const fintech = getOddsTable().find((r) => r.sector === "FinTech");
    const source = benchmarks.by_sector_and_amount_bucket.find(
      (b) => b.venture_sector === "FinTech" && b.amount_bucket === "<$1M",
    );
    expect(fintech?.buckets["<$1M"]).toEqual({
      p24: source?.probability_another_filing_by_month?.["24"],
      gap: source?.conditional_median_months,
      rounds: source?.n_rounds,
    });
  });
});

describe("formatting", () => {
  it("formats money, percentages and dates", () => {
    expect(money(1_400_000)).toBe("$1.4M");
    expect(money(2_000_000)).toBe("$2M");
    expect(money(950_000)).toBe("$950,000");
    expect(money(8_589_661_278)).toBe("$8.59B");
    expect(money(415_749_740)).toBe("$415.75M");
    expect(pct(0.328)).toBe("32.8%");
    expect(longDate("2026-09-30")).toBe("September 30, 2026");
  });
});
