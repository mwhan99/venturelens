"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { count, money, pct, type SectorPoint, type YearPoint } from "@/lib/formd/summary";

// Hand-drawn SVG charts for the Atlas design (no chart library). Colours were
// checked with the colour-blindness validator against the white card.
const C = {
  a: "#5b3df5", // primary series
  b: "#e0552d", // comparison series
  ink: "#121117",
  muted: "#5d5b68",
  grid: "#efedf4",
  surface: "#ffffff",
};

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

type Tip = { x: number; y: number; body: ReactNode } | null;

function Frame({
  height,
  label,
  tip,
  children,
  table,
}: {
  height: number;
  label: string;
  tip: Tip;
  children: (width: number) => ReactNode;
  table: ReactNode;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  return (
    <div ref={ref} className="relative" style={{ height }}>
      {width ? (
        <svg width={width} height={height} role="img" aria-label={label} className="block font-sans">
          {children(width)}
        </svg>
      ) : null}
      {tip && width ? (
        <div
          className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-xs font-medium leading-snug text-white shadow-lg"
          style={{
            left: Math.min(Math.max(0, tip.x - 80), width - 170),
            top: Math.max(0, tip.y - 72),
          }}
        >
          {tip.body}
        </div>
      ) : null}
      <table className="sr-only">{table}</table>
    </div>
  );
}

// Bar with a 4px rounded top and a square base on the axis.
function barPath(x: number, y: number, w: number, h: number, r = 4) {
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function hbarPath(x: number, y: number, w: number, h: number, r = 4) {
  r = Math.min(r, h / 2, w);
  return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
}

export function YearBars({ data }: { data: YearPoint[] }) {
  const [tip, setTip] = useState<Tip>(null);
  const [hover, setHover] = useState<number | null>(null);
  const height = 260;
  const peak = data.reduce((a, d) => (d.rounds > a.rounds ? d : a));
  const max = Math.ceil(peak.rounds / 2500) * 2500;
  const ticks = Array.from({ length: max / 2500 + 1 }, (_, i) => i * 2500);
  return (
    <Frame
      height={height}
      label={`Completed venture rounds per year, ${data[0].year} to ${data[data.length - 1].year}. Peak of ${count(peak.rounds)} in ${peak.year}.`}
      tip={tip}
      table={
        <tbody>
          {data.map((d) => (
            <tr key={d.year}>
              <th>{d.year}{d.partial ? " (partial)" : ""}</th>
              <td>{d.rounds} rounds</td>
              <td>median {money(d.median)}</td>
            </tr>
          ))}
        </tbody>
      }
    >
      {(width) => {
        const m = { t: 28, r: 4, b: 26, l: 40 };
        const w = width - m.l - m.r;
        const h = height - m.t - m.b;
        const y = (v: number) => m.t + h - (v / max) * h;
        const step = w / data.length;
        const bw = Math.max(4, step - 2);
        const every = width < 520 ? 4 : 2;
        return (
          <>
            <defs>
              <pattern id="hatch-years" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="5" height="5" fill={C.surface} />
                <line x1="0" y1="0" x2="0" y2="5" stroke={C.a} strokeWidth="2" />
              </pattern>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} stroke={C.grid} />
                <text x={m.l - 8} y={y(t) + 4} textAnchor="end" fill={C.muted} fontSize="11">
                  {t === 0 ? "0" : `${t / 1000}k`}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const x = m.l + i * step + (step - bw) / 2;
              return (
                <g key={d.year}>
                  <path
                    d={barPath(x, y(d.rounds), bw, m.t + h - y(d.rounds))}
                    fill={d.partial ? "url(#hatch-years)" : C.a}
                    stroke={d.partial ? C.a : "none"}
                    opacity={hover === i ? 0.8 : 1}
                  />
                  {i % every === 0 || i === data.length - 1 ? (
                    <text x={x + bw / 2} y={height - 8} textAnchor="middle" fill={C.muted} fontSize="11">
                      {width < 520 ? `’${String(d.year).slice(2)}` : d.year}
                    </text>
                  ) : null}
                  {d === peak ? (
                    <text x={x + bw / 2} y={y(d.rounds) - 8} textAnchor="middle" fill={C.ink} fontSize="12" fontWeight="600">
                      {count(d.rounds)} in {d.year}
                    </text>
                  ) : null}
                  <rect
                    x={m.l + i * step}
                    y={m.t}
                    width={step}
                    height={h}
                    fill="transparent"
                    onMouseEnter={() => {
                      setHover(i);
                      setTip({
                        x: x + bw / 2,
                        y: y(d.rounds),
                        body: (
                          <>
                            <b>{d.year}{d.partial ? " (Jan–Sep)" : ""}</b>
                            <br />
                            {count(d.rounds)} rounds
                            <br />
                            Median round {money(d.median)}
                          </>
                        ),
                      });
                    }}
                    onMouseLeave={() => {
                      setHover(null);
                      setTip(null);
                    }}
                  />
                </g>
              );
            })}
          </>
        );
      }}
    </Frame>
  );
}

type Series = { label: string; color: string; values: number[] };

export function OddsCurve({ technology, overall, minGap }: { technology: number[]; overall: number[]; minGap: number }) {
  const [tip, setTip] = useState<Tip>(null);
  const [month, setMonth] = useState<number | null>(null);
  const series: Series[] = [
    { label: "Technology", color: C.a, values: technology },
    { label: "All startups", color: C.b, values: overall },
  ];
  const height = 280;
  const top = Math.ceil(Math.max(...technology, ...overall) * 5 + 0.5) / 5;
  return (
    <Frame
      height={height}
      label={`Share of rounds followed by another Form D filing, by months since the round. By 24 months: Technology ${pct(technology[23])}, all startups ${pct(overall[23])}.`}
      tip={tip}
      table={
        <tbody>
          {[6, 12, 18, 24, 36].map((mo) => (
            <tr key={mo}>
              <th>By month {mo}</th>
              <td>Technology {pct(technology[mo - 1])}</td>
              <td>All startups {pct(overall[mo - 1])}</td>
            </tr>
          ))}
        </tbody>
      }
    >
      {(width) => {
        const m = { t: 16, r: width < 520 ? 82 : 100, b: 30, l: 40 };
        const w = width - m.l - m.r;
        const h = height - m.t - m.b;
        const x = (mo: number) => m.l + (mo / 36) * w;
        const y = (p: number) => m.t + h - (p / top) * h;
        const ticks = Array.from({ length: Math.round(top / 0.2) + 1 }, (_, i) => i * 0.2);
        return (
          <>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={m.l} x2={m.l + w} y1={y(t)} y2={y(t)} stroke={C.grid} />
                <text x={m.l - 8} y={y(t) + 4} textAnchor="end" fill={C.muted} fontSize="11">
                  {Math.round(t * 100)}%
                </text>
              </g>
            ))}
            {(width < 520 ? [0, 12, 24, 36] : [0, 6, 12, 18, 24, 30, 36]).map((mo) => (
              <text key={mo} x={x(mo)} y={height - 10} textAnchor="middle" fill={C.muted} fontSize="11">
                {mo === 0 ? "0" : `${mo} mo`}
              </text>
            ))}
            {/* Months 0–3 can't be measured (offerings within 90 days are one round), so shade them instead of drawing 0%. */}
            <rect x={x(0)} y={m.t} width={x(minGap) - x(0)} height={h} fill={C.grid} />
            {width >= 520 ? (
              <text x={x(minGap) + 6} y={m.t + 12} fill={C.muted} fontSize="11">
                under {minGap} months: not measurable
              </text>
            ) : null}
            {series.map((s, si) => {
              const pts = s.values.map((p, i) => [x(i + 1), y(p)] as const).filter((_, i) => i + 1 > minGap);
              const last = pts[pts.length - 1];
              return (
                <g key={s.label}>
                  <path
                    d={`M${pts.map((p) => p.join(",")).join("L")}`}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  <circle cx={last[0]} cy={last[1]} r="4" fill={s.color} stroke={C.surface} strokeWidth="2" />
                  <text x={last[0] + 8} y={last[1] + (si === 0 ? -2 : 12)} fill={C.ink} fontSize="12" fontWeight="600">
                    {s.label}
                  </text>
                </g>
              );
            })}
            {month ? (
              <g>
                <line x1={x(month)} x2={x(month)} y1={m.t} y2={m.t + h} stroke={C.muted} strokeDasharray="3 3" />
                {series.map((s) => (
                  <circle key={s.label} cx={x(month)} cy={y(s.values[month - 1])} r="5" fill={s.color} stroke={C.surface} strokeWidth="2" />
                ))}
              </g>
            ) : null}
            <rect
              x={m.l}
              y={m.t}
              width={w}
              height={h}
              fill="transparent"
              onMouseMove={(e) => {
                const box = e.currentTarget.getBoundingClientRect();
                const mo = Math.min(36, Math.max(minGap + 1, Math.round(((e.clientX - box.left) / box.width) * 36)));
                setMonth(mo);
                setTip({
                  x: x(mo),
                  y: y(series[0].values[mo - 1]),
                  body: (
                    <>
                      <b>By month {mo}</b>
                      {series.map((s) => (
                        <span key={s.label} className="block">
                          <span style={{ color: s.color }}>●</span> {s.label}: {pct(s.values[mo - 1])}
                        </span>
                      ))}
                    </>
                  ),
                });
              }}
              onMouseLeave={() => {
                setMonth(null);
                setTip(null);
              }}
            />
          </>
        );
      }}
    </Frame>
  );
}

export function SectorBars({ data }: { data: SectorPoint[] }) {
  const [tip, setTip] = useState<Tip>(null);
  const [hover, setHover] = useState<number | null>(null);
  const rowH = 36;
  const height = data.length * rowH + 4;
  const scaleMax = Math.ceil(Math.max(...data.map((d) => d.p24)) * 10) / 10;
  return (
    <Frame
      height={height}
      label={`Share of rounds followed by another Form D filing within 24 months, by sector. Highest: ${data[0].name} ${pct(data[0].p24)}.`}
      tip={tip}
      table={
        <tbody>
          {data.map((d) => (
            <tr key={d.name}>
              <th>{d.name}</th>
              <td>{pct(d.p24)} within 24 months</td>
              <td>typical gap {d.gap.toFixed(1)} months</td>
              <td>{d.rounds} rounds</td>
            </tr>
          ))}
        </tbody>
      }
    >
      {(width) => {
        const labelW = width < 520 ? 126 : 156;
        const valueW = 54;
        const w = width - labelW - valueW;
        return (
          <>
            {data.map((d, i) => {
              const yy = i * rowH + 8;
              const bw = (d.p24 / scaleMax) * w;
              return (
                <g key={d.name}>
                  <text x={0} y={yy + 13} fill={C.ink} fontSize={width < 520 ? 12 : 13}>
                    {d.name}
                  </text>
                  <rect x={labelW} y={yy} width={w} height={16} rx="2" fill={C.grid} />
                  <path d={hbarPath(labelW, yy, bw, 16)} fill={C.a} opacity={hover === i ? 0.8 : 1} />
                  <text x={labelW + w + 8} y={yy + 13} fill={C.ink} fontSize="13" fontWeight="600">
                    {pct(d.p24)}
                  </text>
                  <rect
                    x={0}
                    y={yy - 10}
                    width={width}
                    height={rowH}
                    fill="transparent"
                    onMouseEnter={() => {
                      setHover(i);
                      setTip({
                        x: labelW + bw,
                        y: yy + 4,
                        body: (
                          <>
                            <b>{d.name}</b>
                            <br />
                            {pct(d.p24)} filed again within 24 months
                            <br />
                            Typical gap when they did: {d.gap.toFixed(1)} months
                            <br />
                            {count(d.rounds)} rounds
                          </>
                        ),
                      });
                    }}
                    onMouseLeave={() => {
                      setHover(null);
                      setTip(null);
                    }}
                  />
                </g>
              );
            })}
          </>
        );
      }}
    </Frame>
  );
}
