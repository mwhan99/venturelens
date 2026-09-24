import { AnalyzeStartupForm } from "@/components/analyze/AnalyzeStartupForm";
import { PageHeader, PageShell } from "@/components/PageChrome";

export default function AnalyzePage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Analyze Startup"
        title="Structured screening intake"
        description="Enter company, financial, term, and risk data. Click Analyze Startup to generate deterministic financial screening results."
      />
      <div className="mt-8 min-w-0">
        <AnalyzeStartupForm />
      </div>
    </PageShell>
  );
}
