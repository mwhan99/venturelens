import { buildDemoCompanies } from "../src/data/demo-dataset";
import { matchHistoricalCases } from "../src/lib/cases/match";

const demos = buildDemoCompanies().map((company, index) => ({
  ...company,
  id: `demo-${index}`,
  dateAnalyzed: new Date().toISOString(),
}));

for (const company of demos) {
  const result = matchHistoricalCases(company);
  const flags = result.flags
    .map((flag) => `${flag.id}:${flag.status}`)
    .join(" | ");
  const tags = result.riskTags.join(", ") || "(none)";
  const matches =
    result.matches
      .map(
        (match) =>
          `${match.case.companyName} (${match.matchedTags.join(", ")})`,
      )
      .join("; ") || "no strong match";

  console.log(`\n${company.profile.companyName}`);
  console.log(`  flags: ${flags}`);
  console.log(`  tags: ${tags}`);
  console.log(`  matches: ${matches}`);
}
