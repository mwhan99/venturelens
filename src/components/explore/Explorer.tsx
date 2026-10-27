"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { OddsCurve } from "@/components/charts/Charts";
import {
  DEFAULT_SELECTION,
  MILESTONES,
  SECTORS,
  SIZES,
  STAGES,
  describe,
  key,
  parseSelection,
  toQuery,
  type Segment,
  type Selection,
} from "@/lib/formd/explorer";
import { count, pct } from "@/lib/formd/summary";

type Props = { segments: Record<string, Segment>; minGap: number };

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
        on ? "bg-brand text-white" : "bg-background text-ink hover:bg-brand-soft"
      }`}
    >
      {children}
    </button>
  );
}

function Group({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
        {label} {hint ? <span className="font-medium normal-case tracking-normal">· {hint}</span> : null}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

const card = "min-w-0 rounded-[18px] border border-line bg-card p-6 sm:rounded-[22px] sm:p-7";

export function ExplorerView({
  segments,
  minGap,
  selection,
  onChange,
}: Props & { selection: Selection; onChange: (next: Selection) => void }) {
  const [copied, setCopied] = useState(false);
  const segment = segments[key(selection)];
  const overall = segments[key({ sector: "all", size: null, stage: null })];
  const isOverall = key(selection) === key({ sector: "all", size: null, stage: null });
  const p24 = segment?.curve?.[23];
  const diff = p24 !== undefined && overall.curve ? p24 - overall.curve[23] : null;

  return (
    <div className="grid gap-4 md:gap-5">
      <section className={`${card} grid gap-5`}>
        <Group label="Sector">
          {SECTORS.map((s) => (
            <Pill key={s.slug} on={selection.sector === s.slug} onClick={() => onChange({ ...selection, sector: s.slug })}>
              {s.label}
            </Pill>
          ))}
        </Group>
        <div className="grid gap-5 md:grid-cols-2">
          <Group label="Round size" hint="amount sold">
            <Pill on={!selection.size} onClick={() => onChange({ ...selection, size: null })}>
              Any size
            </Pill>
            {SIZES.map((s) => (
              <Pill key={s.slug} on={selection.size === s.slug} onClick={() => onChange({ ...selection, size: s.slug, stage: null })}>
                {s.label}
              </Pill>
            ))}
          </Group>
          <Group label="Stage" hint="the company’s nth round in the data">
            <Pill on={!selection.stage} onClick={() => onChange({ ...selection, stage: null })}>
              Any stage
            </Pill>
            {STAGES.map((s) => (
              <Pill key={s.slug} on={selection.stage === s.slug} onClick={() => onChange({ ...selection, stage: s.slug, size: null })}>
                {s.label}
              </Pill>
            ))}
          </Group>
        </div>
        <p className="text-sm text-muted">
          Round size and stage are split separately in the data, so picking one clears the other.
        </p>
      </section>

      {segment?.curve ? (
        <>
          <div className="grid gap-4 md:grid-cols-[1fr_1.5fr] md:gap-5">
            <section className="flex min-w-0 flex-col justify-between gap-6 rounded-[18px] bg-brand p-6 text-white sm:rounded-[22px] sm:p-8" aria-live="polite">
              <p className="text-sm opacity-80">Within 24 months</p>
              <div>
                <p className="font-display text-[clamp(64px,9vw,104px)] font-bold leading-[0.9] tracking-[-0.05em]">{pct(p24!)}</p>
                <p className="mt-4 text-lg leading-snug">
                  of {describe(selection)} were followed by another Form D filing.
                </p>
                {!isOverall && diff !== null ? (
                  <p className="mt-3 text-sm opacity-85">
                    {Math.abs(diff) < 0.005
                      ? "About the same as all startups"
                      : `${(Math.abs(diff) * 100).toFixed(1)} points ${diff > 0 ? "higher" : "lower"} than all startups`}{" "}
                    ({pct(overall.curve![23])}).
                  </p>
                ) : null}
              </div>
            </section>
            <section className={card}>
              <h2 className="font-display text-2xl font-bold tracking-[-0.03em]">Month by month</h2>
              <p className="mb-4 mt-1 text-[15px] text-muted">Share followed by another Form D filing, by months since the round.</p>
              <ul className="grid grid-cols-3 gap-2 lg:grid-cols-6">
                {MILESTONES.map((m) => (
                  <li key={m} className="rounded-[14px] bg-background px-3 py-3">
                    <p className="text-xs font-semibold text-muted">By {m} months</p>
                    <p className="mt-1 font-display text-2xl font-bold tracking-[-0.03em]">{pct(segment.curve![m - 1])}</p>
                  </li>
                ))}
                <li className="rounded-[14px] bg-background px-3 py-3">
                  <p className="text-xs font-semibold text-muted">Under {minGap} months</p>
                  <p className="mt-1 text-sm font-semibold leading-tight">Not measurable</p>
                </li>
              </ul>
              <dl className="mt-5 grid gap-3 text-[15px] sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Typical gap, when they did file again</dt>
                  <dd className="font-display text-xl font-bold">{segment.gap ? `${segment.gap.toFixed(1)} months` : "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Based on</dt>
                  <dd className="font-display text-xl font-bold">
                    {count(segment.rounds)} rounds{" "}
                    <span className="font-sans text-sm font-medium text-muted">({count(segment.filedAgain)} filed again)</span>
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <section className={card}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-[-0.03em]">The curve</h2>
                <p className="mt-1 text-[15px] text-muted">Hover or tap to read any month.</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  } catch {
                    setCopied(false);
                  }
                }}
                className="rounded-full bg-brand-soft px-4 py-2 text-sm font-bold text-brand hover:bg-[#ddd5ff]"
              >
                {copied ? "Link copied" : "Copy link to this view"}
              </button>
            </div>
            <div className="mb-2 mt-4 flex flex-wrap gap-4 text-sm font-semibold">
              <span><i className="mr-1.5 inline-block h-1 w-4 rounded-sm bg-brand align-middle" />{isOverall ? "All startups" : "Selected"}</span>
              {!isOverall ? (
                <span><i className="mr-1.5 inline-block h-1 w-4 rounded-sm bg-coral align-middle" />All startups</span>
              ) : null}
            </div>
            <OddsCurve
              height={300}
              minGap={minGap}
              series={
                isOverall
                  ? [{ label: "All startups", values: segment.curve }]
                  : [
                      { label: "Selected", values: segment.curve },
                      { label: "All startups", values: overall.curve! },
                    ]
              }
            />
          </section>
        </>
      ) : (
        <section className={card} aria-live="polite">
          <h2 className="font-display text-2xl font-bold tracking-[-0.03em]">Too few rounds to measure</h2>
          <p className="mt-2 text-muted">
            This group has {segment ? count(segment.rounds) : "too few"} rounds, under the 100 needed for a reliable estimate. Try a
            broader choice.
          </p>
        </section>
      )}
    </div>
  );
}

/** Reads and writes the choice in the address, so every view is a shareable link. */
export function Explorer(props: Props) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  return (
    <ExplorerView
      {...props}
      selection={parseSelection(params)}
      onChange={(next) => router.replace(`${pathname}?${toQuery(next)}`, { scroll: false })}
    />
  );
}

/** Shown in the prebuilt page until the browser has read the address. */
export function ExplorerFallback(props: Props) {
  return <ExplorerView {...props} selection={DEFAULT_SELECTION} onChange={() => {}} />;
}
