import { describe, expect, it } from "vitest";
import { VALIDATION, validationTotals } from "@/data/validation";

describe("validation table", () => {
  it("adds up to the totals in FINDINGS.md (59 of 82 rounds, 10 companies)", () => {
    expect(validationTotals()).toEqual({ companies: 10, reported: 82, matched: 59 });
  });

  it("never finds more reported rounds than were reported", () => {
    for (const row of VALIDATION) {
      expect(row.matched).toBeLessThanOrEqual(row.reported);
      expect(row.matched).toBeGreaterThan(0);
    }
  });

  it("is sorted from most to least complete", () => {
    const shares = VALIDATION.map((r) => r.matched / r.reported);
    expect(shares).toEqual([...shares].sort((a, b) => b - a));
  });
});
