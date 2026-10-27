// The site's public address, for link previews, the sitemap and robots.txt.
// Vercel sets VERCEL_PROJECT_PRODUCTION_URL on every build. Set SITE_URL to
// override it (for example after adding a custom domain).
function resolveSiteUrl(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "https://venturelens-chi.vercel.app";
}

export const SITE_URL = resolveSiteUrl();
export const SITE_NAME = "VentureLens";
export const REPO_URL = "https://github.com/mwhan99/venturelens";

/** Every page worth listing in the sitemap. */
export const PUBLIC_PATHS = ["/", "/explore", "/companies", "/methodology", "/screen", "/screen/portfolio", "/screen/compare", "/screen/memo"] as const;
