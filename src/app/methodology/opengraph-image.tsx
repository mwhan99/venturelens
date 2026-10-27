import summary from "@/data/formd/summary.json";
import { validationTotals } from "@/data/validation";
import { count } from "@/lib/formd/summary";
import { OG_SIZE, renderOgImage } from "@/lib/og";

const totals = validationTotals();

export const alt = `VentureLens methodology: how ${count(summary.funnel[0].companies)} SEC Form D filers become ${count(summary.headline.companies)} startups, and a check against ${totals.companies} well-known companies (${totals.matched} of ${totals.reported} reported rounds found).`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    eyebrow: `${count(summary.funnel[0].companies)} filers, ${count(summary.headline.companies)} startups`,
    title: "How the numbers are made",
    stat: `${totals.matched}/${totals.reported}`,
    statLabel: `reported rounds of ${totals.companies} well-known startups found in Form D`,
  });
}
