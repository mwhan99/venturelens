import { describe, expect, it } from "vitest";
import { buildDemoCompanies } from "@/data/demo-dataset";
import { matchHistoricalCases } from "@/lib/cases/match";

const demos = buildDemoCompanies().map((company, index) => ({
  ...company,
  id: `demo-${index}`,
  dateAnalyzed: "2026-10-26T00:00:00.000Z",
}));

// Which historical cases each demo company matches, and on which shared tags.
// A match needs at least two shared risk tags.
const expectedMatches: Record<string, Record<string, string[]>> = {
  NovaPay: {
    WeWork: ["high-burn", "aggressive-growth", "financing-dependency"],
    Fast: ["high-burn", "weak-capital-efficiency", "financing-dependency"],
  },
  CloudCore: {},
  MedFlow: {},
  GreenGrid: {
    WeWork: ["high-burn", "aggressive-growth", "financing-dependency"],
    Fast: ["high-burn", "weak-capital-efficiency", "financing-dependency"],
    Airlift: ["financing-dependency", "runway-risk", "capital-intensive"],
  },
  RetailAI: {},
  SecureStack: {},
  FoodLoop: {
    Fast: ["weak-capital-efficiency", "financing-dependency"],
    Airlift: ["financing-dependency", "runway-risk"],
  },
  LegalMind: {
    WeWork: ["high-burn", "aggressive-growth", "financing-dependency"],
    Fast: ["high-burn", "weak-capital-efficiency", "financing-dependency"],
  },
  LogiFlow: {},
  CreatorHub: {
    WeWork: ["high-burn", "aggressive-growth", "financing-dependency"],
    Fast: ["high-burn", "weak-capital-efficiency", "financing-dependency"],
  },
};

describe("historical case matching on the demo companies", () => {
  it("covers every demo company", () => {
    expect(demos.map((company) => company.profile.companyName).sort()).toEqual(
      Object.keys(expectedMatches).sort(),
    );
  });

  it.each(demos.map((company) => [company.profile.companyName, company] as const))(
    "%s",
    (name, company) => {
      const { matches } = matchHistoricalCases(company);
      const actual = Object.fromEntries(
        matches.map((match) => [match.case.companyName, match.matchedTags]),
      );
      expect(actual).toEqual(expectedMatches[name]);
      for (const match of matches) {
        expect(match.matchedTags.length).toBeGreaterThanOrEqual(2);
      }
    },
  );
});
