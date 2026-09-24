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
      className={`mx-auto min-w-0 px-4 py-8 sm:px-6 lg:px-10 lg:py-10 ${
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
    <div className="flex flex-col gap-6 border-b border-slate-200 pb-8 print:hidden lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 max-w-2xl">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
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
  actionHref = "/analyze",
  actionLabel = "Analyze Startup",
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <p className="text-sm font-medium text-slate-800">{title}</p>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      ) : null}
      <Link
        href={actionHref}
        className="mt-5 inline-flex h-10 items-center rounded-md bg-[#1f8a70] px-4 text-sm font-medium text-white hover:bg-[#18735d]"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

export const cardClass =
  "rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

export const tableHeadClass =
  "bg-slate-50 text-[11px] uppercase tracking-[0.12em] text-slate-500";

export const badgeBaseClass =
  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]";
