import { DatasetBenchmark } from "@/components/benchmark/DatasetBenchmark";
import { PageHeader, PageShell } from "@/components/PageChrome";

export default function BenchmarkPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Dataset Benchmark"
        title="Peer median comparison"
        description="Compare a saved company against the median of companies currently stored in your VentureLens dataset."
      />
      <div className="mt-8 min-w-0">
        <DatasetBenchmark />
      </div>
    </PageShell>
  );
}
