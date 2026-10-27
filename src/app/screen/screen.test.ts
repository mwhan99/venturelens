import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LEGACY_REDIRECTS } from "../../../next.config";
import { DEMO_SEEDED_KEY, shouldSeedDemo } from "@/components/screen/DemoSeeder";
import { SCREEN_TABS } from "@/components/screen/ScreenTabs";

const appDir = fileURLToPath(new URL("..", import.meta.url));

/** "/screen/portfolio/:id" → src/app/screen/portfolio/[id]/page.tsx */
function pageFileFor(path: string) {
  const segments = path.split("/").filter(Boolean).map((s) => (s.startsWith(":") ? `[${s.slice(1)}]` : s));
  return `${appDir}${segments.join("/")}${segments.length ? "/" : ""}page.tsx`;
}

describe("old addresses", () => {
  it.each(LEGACY_REDIRECTS.map((r) => [r.source, r.destination]))("%s redirects to a page that exists (%s)", (source, destination) => {
    expect(existsSync(pageFileFor(destination))).toBe(true);
    // The old page itself is gone, so the redirect is what answers.
    expect(existsSync(pageFileFor(source))).toBe(false);
  });

  it("covers every page the old sidebar linked to", () => {
    const sources = LEGACY_REDIRECTS.map((r) => r.source);
    for (const old of ["/analyze", "/portfolio", "/memo", "/compare", "/benchmark", "/cases"]) {
      expect(sources).toContain(old);
    }
  });
});

describe("screen tabs", () => {
  it.each(SCREEN_TABS.map((t) => [t.label, t.href]))("%s tab points at a real page", (_label, href) => {
    expect(existsSync(pageFileFor(href))).toBe(true);
  });
});

describe("first-visit demo data", () => {
  const storage = (value: string | null) => ({ getItem: (key: string) => (key === DEMO_SEEDED_KEY ? value : null) });

  it("loads the demo companies on a first visit with nothing saved", () => {
    expect(shouldSeedDemo(storage(null), 0)).toBe(true);
  });

  it("never loads them twice, even if the visitor deleted them", () => {
    expect(shouldSeedDemo(storage("1"), 0)).toBe(false);
  });

  it("doesn't touch a returning visitor's own companies", () => {
    expect(shouldSeedDemo(storage(null), 3)).toBe(false);
  });
});
