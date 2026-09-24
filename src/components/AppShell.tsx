"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { IconClose, IconMenu, LogoMark } from "@/components/icons";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-full min-w-0 bg-[#f3f5f8] print:bg-white">
      <div className="hidden w-64 shrink-0 print:hidden lg:block">
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-40 print:hidden lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-50 h-full w-[min(16rem,100%)]">
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 print:hidden lg:hidden">
          <div className="flex items-center gap-2">
            <LogoMark className="h-7 w-7" />
            <span className="text-sm font-semibold text-slate-900">
              VentureLens
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded-md border border-slate-200 p-2 text-slate-700"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? (
              <IconClose className="h-4 w-4" />
            ) : (
              <IconMenu className="h-4 w-4" />
            )}
          </button>
        </header>
        <main className="min-w-0 flex-1 print:bg-white">{children}</main>
      </div>
    </div>
  );
}
