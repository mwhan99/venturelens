import type { MetadataRoute } from "next";
import benchmarks from "@/data/formd/benchmarks.json";
import { PUBLIC_PATHS, SITE_URL } from "@/lib/site";

// The pages search engines should know about. Saved-company pages live only
// in each visitor's browser, so they aren't listed.
export default function sitemap(): MetadataRoute.Sitemap {
  const dataDate = new Date(`${benchmarks.dataset_end_date}T00:00:00Z`);
  return PUBLIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified: dataDate,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : path.startsWith("/screen/") ? 0.5 : 0.8,
  }));
}
