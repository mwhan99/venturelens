import {
  formatFinancingBenchmark,
  getFinancingBenchmark,
  type FinancingBenchmarkInput,
} from "@/lib/formd/benchmarks";

export function FinancingBenchmarkCard(input: FinancingBenchmarkInput) {
  const copy = formatFinancingBenchmark(getFinancingBenchmark(input));

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
          SEC Form D
        </p>
        <h2 className="mt-1 text-base font-semibold text-slate-900">
          Financing Benchmark (SEC Form D)
        </h2>
      </div>
      <div className="space-y-3 px-5 py-4 sm:px-6">
        <p className="text-sm leading-6 text-slate-700">{copy.headline}</p>
        {copy.median ? (
          <p className="text-sm leading-6 text-slate-700">{copy.median}</p>
        ) : null}
        {copy.caution ? (
          <p className="text-sm leading-6 text-slate-700">{copy.caution}</p>
        ) : null}
        <p className="text-xs leading-5 text-slate-500">{copy.footnote}</p>
      </div>
    </section>
  );
}
