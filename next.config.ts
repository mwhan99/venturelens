import type { NextConfig } from "next";

// Old addresses from before the calculator moved under /screen (rebuild plan
// step 9). They may be in old links and bookmarks, so they must keep working.
// Query strings are passed through automatically.
export const LEGACY_REDIRECTS = [
  { source: "/analyze", destination: "/screen" },
  { source: "/portfolio", destination: "/screen/portfolio" },
  { source: "/portfolio/:id", destination: "/screen/portfolio/:id" },
  { source: "/compare", destination: "/screen/compare" },
  { source: "/memo", destination: "/screen/memo" },
  // Removed pages: the closest page that still exists.
  { source: "/benchmark", destination: "/screen/compare" },
  { source: "/cases", destination: "/screen/portfolio" },
] as const;

const nextConfig: NextConfig = {
  devIndicators: false,
  async redirects() {
    return LEGACY_REDIRECTS.map((r) => ({ ...r, permanent: true }));
  },
};

export default nextConfig;
