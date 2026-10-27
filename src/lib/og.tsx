import { ImageResponse } from "next/og";
import { SITE_URL } from "@/lib/site";

// Link-preview images (the card LinkedIn, Slack and iMessage show) in the
// Atlas design. Built once at build time and cached.

export const OG_SIZE = { width: 1200, height: 630 };

const C = {
  bg: "#f5f4f8",
  card: "#ffffff",
  ink: "#121117",
  muted: "#5d5b68",
  line: "#e7e5ee",
  brand: "#5b3df5",
  coral: "#e0552d",
  lime: "#d7f36b",
};

/**
 * Fetch just the letters we need from Google Fonts as a .ttf. If the network
 * is unavailable the image falls back to the built-in font instead of failing
 * the build.
 */
async function loadFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(url)).text();
    const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!src) return null;
    const response = await fetch(src);
    return response.ok ? await response.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export type OgCard = {
  eyebrow: string;
  title: string;
  /** The big number in the violet panel. */
  stat: string;
  statLabel: string;
  footer?: string;
};

export async function renderOgImage({ eyebrow, title, stat, statLabel, footer = new URL(SITE_URL).host }: OgCard) {
  const text = `VentureLens${eyebrow}${title}${stat}${statLabel}${footer}`;
  const [bold, medium] = await Promise.all([loadFont("Space Grotesk", 700, text), loadFont("DM Sans", 500, text)]);
  const fonts = [
    ...(bold ? [{ name: "Display", data: bold, weight: 700 as const, style: "normal" as const }] : []),
    ...(medium ? [{ name: "Body", data: medium, weight: 500 as const, style: "normal" as const }] : []),
  ];
  const display = bold ? "Display" : "sans-serif";
  const body = medium ? "Body" : "sans-serif";

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: C.bg, padding: 40, gap: 24, fontFamily: body }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1.25,
            background: C.card,
            border: `2px solid ${C.line}`,
            borderRadius: 32,
            padding: 48,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: display, fontSize: 34, fontWeight: 700, color: C.ink }}>
            <div style={{ display: "flex", width: 34, height: 34, borderRadius: 17, background: `linear-gradient(135deg, ${C.brand} 50%, ${C.coral} 50%)` }} />
            VentureLens
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ display: "flex" }}>
              <div style={{ display: "flex", background: C.lime, color: C.ink, borderRadius: 999, padding: "8px 18px", fontSize: 24, fontWeight: 500 }}>
                {eyebrow}
              </div>
            </div>
            <div style={{ display: "flex", fontFamily: display, fontSize: 68, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2.5, color: C.ink }}>
              {title}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 24, color: C.muted }}>{footer}</div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            flex: 1,
            background: C.brand,
            borderRadius: 32,
            padding: 48,
            color: "#ffffff",
          }}
        >
          <div style={{ display: "flex", fontFamily: display, fontSize: stat.length > 6 ? 104 : 140, fontWeight: 700, lineHeight: 0.95, letterSpacing: -5 }}>
            {stat}
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 30, lineHeight: 1.3 }}>{statLabel}</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined },
  );
}
