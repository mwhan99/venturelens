import { getSegments, key } from "@/lib/formd/explorer";
import { pct } from "@/lib/formd/summary";
import { OG_SIZE, renderOgImage } from "@/lib/og";

const techMid = getSegments()[key({ sector: "technology", size: "1-5m", stage: null })].curve![23];

export const alt = `VentureLens fundraising odds explorer: ${pct(techMid)} of $1–5M Technology rounds were followed by another SEC Form D filing within 24 months. Pick a sector, round size or stage.`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOgImage({
    eyebrow: "By sector, round size and stage",
    title: "Fundraising odds explorer",
    stat: pct(techMid),
    statLabel: "of $1–5M Technology rounds filed again within 24 months",
  });
}
