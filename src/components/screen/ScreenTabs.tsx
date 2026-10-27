"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const SCREEN_TABS = [
  { href: "/screen", label: "Analyze" },
  { href: "/screen/portfolio", label: "Portfolio" },
  { href: "/screen/compare", label: "Compare" },
  { href: "/screen/memo", label: "Memo" },
] as const;

export function ScreenTabs() {
  const pathname = usePathname();
  const active = (href: string) =>
    href === "/screen" ? pathname === "/screen" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Screening calculator" className="relative -mx-1 flex gap-1 overflow-x-auto">
      {SCREEN_TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={active(tab.href) ? "page" : undefined}
          className={`shrink-0 rounded-full px-4 py-2 text-[15px] font-semibold transition-colors ${
            active(tab.href) ? "bg-ink text-white" : "text-ink hover:bg-card"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
