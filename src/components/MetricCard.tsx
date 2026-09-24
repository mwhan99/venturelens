type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  tone: "neutral" | "positive";
};

export function MetricCard({ label, value, detail, tone }: MetricCardProps) {
  return (
    <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 break-words font-mono text-2xl font-medium leading-none tracking-tight text-slate-900 sm:text-[28px]">
        {value}
      </p>
      <p
        className={`mt-2 text-sm ${
          tone === "positive" ? "text-emerald-700" : "text-slate-500"
        }`}
      >
        {detail}
      </p>
    </article>
  );
}
