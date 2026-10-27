import { describe, expect, it } from "vitest";
import {
  amountBucketForInvestment,
  formatFinancingBenchmark,
  getFinancingBenchmark,
  sectorForIndustry,
} from "@/lib/formd/benchmarks";

describe("Form D benchmark lookup", () => {
  it("maps app industries to Form D sectors", () => {
    expect(sectorForIndustry("SaaS")).toBe("Technology");
    expect(sectorForIndustry("HealthTech")).toBe("HealthTech/Biotech");
    expect(sectorForIndustry("Something new")).toBe("Other/Unclassified");
  });

  it("puts check sizes in the Form D amount buckets", () => {
    expect(amountBucketForInvestment(999_999)).toBe("<$1M");
    expect(amountBucketForInvestment(1_000_000)).toBe("$1–5M");
    expect(amountBucketForInvestment(5_000_000)).toBe("$5–20M");
    expect(amountBucketForInvestment(20_000_000)).toBe("$20M+");
  });

  it("reads NovaPay's month from the FinTech $1–5M curve", () => {
    const benchmark = getFinancingBenchmark({
      industry: "FinTech",
      investmentAmount: 2_000_000,
      runwayMonths: 16,
    });
    expect(benchmark).toMatchObject({
      sector: "FinTech",
      bucket: "$1–5M",
      nRounds: 949,
      lookupMonths: 16,
      probabilityWithinRunway: 0.231,
      conditionalMedianMonths: 13.21,
      tone: "neutral",
      usedFallback: false,
    });
    expect(formatFinancingBenchmark(benchmark).headline).toBe(
      "Of 949 comparable FinTech, $1–5M rounds, 23% were followed by another Form D filing within 16 months.",
    );
  });

  it("flags runway shorter than the typical gap", () => {
    const benchmark = getFinancingBenchmark({
      industry: "SaaS",
      investmentAmount: 2_000_000,
      runwayMonths: 10,
    });
    expect(benchmark.tone).toBe("caution");
    expect(formatFinancingBenchmark(benchmark).caution).not.toBeNull();
  });

  it("caps the lookup at 36 months", () => {
    const benchmark = getFinancingBenchmark({
      industry: "SaaS",
      investmentAmount: 2_000_000,
      runwayMonths: 60,
    });
    expect(benchmark.lookupMonths).toBe(36);
  });

  it("says 'not measurable' instead of 0% under 3 months", () => {
    const benchmark = getFinancingBenchmark({
      industry: "SaaS",
      investmentAmount: 2_000_000,
      runwayMonths: 2,
    });
    expect(benchmark.probabilityWithinRunway).toBeNull();
    expect(formatFinancingBenchmark(benchmark).headline).toBe(
      "Under 3 months: not measurable with this data.",
    );
  });
});
