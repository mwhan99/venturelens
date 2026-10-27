import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found" };

const LINKS = [
  { href: "/", label: "Home", text: "How often do startups raise again?" },
  { href: "/explore", label: "Explore odds", text: "Pick a sector, round size or stage." },
  { href: "/companies", label: "Company lookup", text: "Any Form D filer, and why it is or isn’t counted." },
  { href: "/screen", label: "Screen a startup", text: "Runway, returns and risk in one form." },
  { href: "/methodology", label: "Methodology", text: "How the numbers are made." },
] as const;

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6">
      <section className="rounded-[18px] border border-line bg-card p-6 sm:rounded-[22px] sm:p-9">
        <span className="inline-block rounded-full bg-lime px-2.5 py-1 text-[13px] font-bold">404</span>
        <h1 className="mt-4 font-display text-[clamp(32px,4.4vw,52px)] font-bold leading-[1.04] tracking-[-0.04em]">
          This page doesn’t exist
        </h1>
        <p className="mt-3 max-w-[36em] text-lg text-muted">
          The link may be mistyped, or the page may have moved. These are the main parts of VentureLens:
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="block rounded-[14px] bg-background p-4 transition-colors hover:bg-brand-soft">
                <span className="font-display text-lg font-bold text-brand">{link.label} →</span>
                <span className="mt-1 block text-[15px] text-muted">{link.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
