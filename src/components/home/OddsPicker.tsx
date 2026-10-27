"use client";

import { useState } from "react";
import { AMOUNT_BUCKETS, count, pct, type OddsTable } from "@/lib/formd/summary";

const SIZES = ["All sizes", ...AMOUNT_BUCKETS] as const;
type Size = (typeof SIZES)[number];

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
        on ? "bg-lime text-ink" : "bg-[#26242f] text-[#d6d4df] hover:bg-[#33303d]"
      }`}
    >
      {children}
    </button>
  );
}

export function OddsPicker({ table }: { table: OddsTable }) {
  const [sector, setSector] = useState("Technology");
  const [size, setSize] = useState<Size>("$1–5M");
  const row = table.find((r) => r.sector === sector) ?? table[0];
  const cell = size === "All sizes" ? row.all : row.buckets[size];
  const sizeWords: Record<Size, string> = {
    "All sizes": "",
    "<$1M": " under $1M",
    "$1–5M": " of $1–5M",
    "$5–20M": " of $5–20M",
    "$20M+": " of $20M or more",
  };
  const label = `${sector} rounds${sizeWords[size]}`;

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#b9b7c4]">Sector</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {table.map((r) => (
          <Pill key={r.sector} on={r.sector === sector} onClick={() => setSector(r.sector)}>
            {r.sector}
          </Pill>
        ))}
      </div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#b9b7c4]">Round size</p>
      <div className="flex flex-wrap gap-2">
        {SIZES.map((s) => (
          <Pill key={s} on={s === size} onClick={() => setSize(s)}>
            {s}
          </Pill>
        ))}
      </div>
      <div aria-live="polite">
        {cell ? (
          <>
            <p className="mt-6 font-display text-[64px] font-bold leading-none tracking-[-0.04em] text-lime sm:text-[72px]">
              {pct(cell.p24)}
            </p>
            <p className="mt-2 text-[15px] text-white">
              of {label} were followed by another Form D filing within 24 months.
            </p>
            <p className="mt-2 text-sm text-[#b9b7c4]">
              {cell.gap ? `Typical gap when they did: ${cell.gap.toFixed(1)} months. ` : ""}
              Based on {count(cell.rounds)} rounds.
            </p>
          </>
        ) : (
          <p className="mt-6 text-white">Too few rounds to measure this combination.</p>
        )}
      </div>
    </div>
  );
}
