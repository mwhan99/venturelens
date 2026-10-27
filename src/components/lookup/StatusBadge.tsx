import { STATUS_LABEL, type BenchmarkStatus } from "@/lib/lookup";

// Whether a company is counted in the benchmark, as a small label. The text
// always says it, so colour is never the only signal.
export function StatusBadge({ status }: { status: BenchmarkStatus }) {
  const label = STATUS_LABEL[status];
  const tone = label.counted
    ? "bg-brand-soft text-brand"
    : status === "likely_non_startup"
      ? "bg-[#fde9e2] text-[#a63d1d]"
      : "bg-background text-muted";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold ${tone}`}>
      <span aria-hidden="true">{label.counted ? "●" : "○"}</span>
      {label.short}
    </span>
  );
}
