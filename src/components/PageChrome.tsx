import Link from "next/link";
import type { ReactNode } from "react";

export function PageShell({
  children,
  width = "wide",
}: {
  children: ReactNode;
  width?: "wide" | "memo";
}) {
  return (
    <div
      className={`mx-auto min-w-0 px-4 pb-4 pt-4 sm:px-6 ${
        width === "memo" ? "max-w-3xl print:max-w-none print:px-8 print:py-0" : "max-w-6xl"
      }`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 rounded-[18px] border border-line bg-card p-6 print:hidden sm:rounded-[22px] sm:p-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 max-w-2xl">
        <span className="inline-block rounded-full bg-lime px-2.5 py-1 text-[13px] font-bold text-ink">
          {eyebrow}
        </span>
        <h1 className="mt-3 font-display text-[clamp(28px,3.6vw,40px)] font-bold leading-[1.08] tracking-[-0.035em] text-ink">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionHref = "/screen",
  actionLabel = "Analyze Startup",
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-[18px] border border-dashed border-line bg-card px-6 py-16 text-center sm:rounded-[22px]">
      <p className="font-display text-lg font-bold text-ink">{title}</p>
      {description ? (
        <p className="mt-2 text-[15px] leading-6 text-muted">{description}</p>
      ) : null}
      <Link
        href={actionHref}
        className="mt-5 inline-flex h-10 items-center rounded-full bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

export const cardClass = "rounded-[18px] border border-line bg-card";

export const tableHeadClass =
  "bg-slate-50 text-[11px] uppercase tracking-[0.12em] text-slate-500";

export const badgeBaseClass =
  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]";
