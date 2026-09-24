"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  IconAnalyze,
  IconBenchmark,
  IconCases,
  IconCompare,
  IconDashboard,
  IconMemo,
  IconPortfolio,
  LogoMark,
} from "@/components/icons";

const navItems = [
  { href: "/", label: "Dashboard", icon: IconDashboard },
  { href: "/analyze", label: "Analyze Startup", icon: IconAnalyze },
  { href: "/portfolio", label: "Portfolio", icon: IconPortfolio },
  { href: "/memo", label: "Investment Memo", icon: IconMemo },
  { href: "/compare", label: "Compare Startups", icon: IconCompare },
  { href: "/benchmark", label: "Dataset Benchmark", icon: IconBenchmark },
  { href: "/cases", label: "Historical Cases", icon: IconCases },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <aside className="flex h-full w-full max-w-64 flex-col overflow-hidden border-r border-slate-800 bg-[#0c1524] text-slate-300">
      <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-5">
        <LogoMark className="h-8 w-8 shrink-0" />
        <div className="min-w-0">
          <p className="truncate font-sans text-[15px] font-semibold tracking-tight text-white">
            VentureLens
          </p>
          <p className="truncate text-[11px] uppercase tracking-[0.12em] text-slate-500">
            Investment screening
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4" aria-label="Primary">
        {navItems.map((item) => {
          const active =
            ready &&
            (item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex min-w-0 items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-white/10 font-medium text-white shadow-[inset_2px_0_0_0_#1f8a70]"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-5 py-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
          Workspace
        </p>
        <p className="mt-1 truncate text-sm text-slate-200">VentureLens Demo</p>
      </div>
    </aside>
  );
}
