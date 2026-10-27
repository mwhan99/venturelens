// The validation check from pipeline/FINDINGS.md (October 2026): ten well-known
// startups' publicly reported private rounds (press coverage and funding
// trackers, through 2026-09-30) against the rounds the pipeline built from
// Form D. Researched by hand, so it lives here rather than in a generated
// file. Keep it in step with the table in FINDINGS.md.

export type ValidationRow = {
  company: string;
  /** The name (or names) the company files under. */
  formDName: string;
  /** Private rounds reported publicly, excluding IPOs and debt. */
  reported: number;
  /** How many of those reported rounds appear in the Form D data. */
  matched: number;
  /** Rounds the pipeline built for this company. */
  formDRounds: number;
  note: string;
};

export const VALIDATION: ValidationRow[] = [
  { company: "Ramp", formDName: "Ramp Business Corp", reported: 11, matched: 11, formDRounds: 11, note: "Every round is there. The 90-day rule merged a Series B tranche with the Series C, and two 2025 rounds into one." },
  { company: "Databricks", formDName: "Databricks, Inc.", reported: 13, matched: 12, formDRounds: 14, note: "Only the 2016 Series C is missing. Series J is $8.6B against $10B reported." },
  { company: "Figma", formDName: "Figma, Inc.", reported: 7, matched: 6, formDRounds: 7, note: "The 2018 Series B is missing. The 2024 employee tender offer shows up as a round." },
  { company: "Instacart", formDName: "Maplebear Inc.", reported: 10, matched: 8, formDRounds: 9, note: "The $871M Series F and the YC money are missing. Filed under its legal name." },
  { company: "Warby Parker", formDName: "JAND, Inc.", reported: 9, matched: 7, formDRounds: 9, note: "Every round from 2010 to 2018 matches; both 2020 rounds are missing." },
  { company: "Peloton", formDName: "Peloton Interactive, LLC and Inc.", reported: 6, matched: 4, formDRounds: 6, note: "Becoming a corporation gave it a new SEC ID, so it counts as two companies. Series E and F are missing." },
  { company: "Airbnb", formDName: "Airbnb, Inc.", reported: 8, matched: 5, formDRounds: 8, note: "Series B through F match. The seed and Series A came before its first filing here." },
  { company: "Lemonade", formDName: "Lemonade, Inc.", reported: 5, matched: 3, formDRounds: 3, note: "The 2015–16 money is missing; only $175M of the $300M Series D is reported." },
  { company: "Rippling", formDName: "People Center, Inc.", reported: 7, matched: 2, formDRounds: 2, note: "Nothing filed after 2020. Filed under its legal name." },
  { company: "Plaid", formDName: "Plaid Technologies, Inc.", reported: 6, matched: 1, formDRounds: 1, note: "Only the 2016 Series B was filed, so here Plaid looks like it never raised again." },
];

export function validationTotals(rows: ValidationRow[] = VALIDATION) {
  return {
    companies: rows.length,
    reported: rows.reduce((sum, r) => sum + r.reported, 0),
    matched: rows.reduce((sum, r) => sum + r.matched, 0),
  };
}
