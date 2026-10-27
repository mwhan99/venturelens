"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

// Only pages that exist go here. Company lookup is added when it is built
// (rebuild plan step 11).
export const NAV_LINKS = [
  { href: "/explore", label: "Explore odds" },
  { href: "/methodology", label: "Methodology" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/compare", label: "Compare" },
  { href: "/memo", label: "Memo" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="print:hidden">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 pb-2 pt-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-[22px] font-bold tracking-tight text-ink">
          <Logo className="h-[22px] w-[22px]" />
          VentureLens
        </Link>
        <Link
          href="/analyze"
          aria-current={isActive("/analyze") ? "page" : undefined}
          className="rounded-full bg-ink px-4 py-2 text-[15px] font-semibold text-white transition-colors hover:bg-brand sm:order-last"
        >
          Screen a startup
        </Link>
        <nav
          aria-label="Primary"
          className="-mx-1 flex w-full gap-1 overflow-x-auto text-[15px] font-semibold sm:mx-0 sm:ml-auto sm:w-auto"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`shrink-0 rounded-full px-3.5 py-2 transition-colors ${
                isActive(link.href) ? "bg-card text-brand" : "text-ink hover:bg-card"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
