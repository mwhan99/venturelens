import benchmarks from "@/data/formd/benchmarks.json";
import summary from "@/data/formd/summary.json";
import { count, pct } from "@/lib/formd/summary";
import { OG_SIZE, renderOgImage } from "@/lib/og";

export const alt = `VentureLens: how often do startups raise again? ${pct(benchmarks.overall.probability_another_filing_by_month["24"])} of ${count(summary.headline.rounds)} startup rounds were followed by another SEC Form D filing within 24 months.`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    eyebrow: `${count(summary.headline.rounds)} rounds · SEC Form D`,
    title: "How often do startups raise again?",
    stat: pct(benchmarks.overall.probability_another_filing_by_month["24"]),
    statLabel: "of rounds were followed by another filing within 24 months",
  });
}
