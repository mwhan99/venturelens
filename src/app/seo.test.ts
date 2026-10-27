import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { NAV_LINKS } from "@/components/SiteHeader";
import { PUBLIC_PATHS, SITE_URL } from "@/lib/site";

const appDir = fileURLToPath(new URL(".", import.meta.url));
const pageFile = (path: string) => `${appDir}${path === "/" ? "" : `${path.slice(1)}/`}page.tsx`;

describe("sitemap and robots", () => {
  it("lists only pages that exist", () => {
    for (const path of PUBLIC_PATHS) expect(existsSync(pageFile(path)), path).toBe(true);
  });

  it("includes the home page, every header link and the calculator", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain(SITE_URL);
    for (const link of NAV_LINKS) expect(urls).toContain(`${SITE_URL}${link.href}`);
    expect(urls).toContain(`${SITE_URL}/screen`);
  });

  it("uses full https addresses and points robots at the sitemap", () => {
    for (const entry of sitemap()) expect(entry.url).toMatch(/^https:\/\/[^/]+(\/|$)/);
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
});

describe("link previews", () => {
  it.each(["", "explore/", "methodology/"])("app/%sopengraph-image.tsx exists", (dir) => {
    expect(existsSync(`${appDir}${dir}opengraph-image.tsx`)).toBe(true);
  });
});
