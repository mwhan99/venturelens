import { AnalyzeStartupForm } from "@/components/analyze/AnalyzeStartupForm";
import { PageHeader, PageShell } from "@/components/PageChrome";

export default function AnalyzePage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Screen a startup"
        title="Runway, returns and risk in one form"
        description="Enter a startup’s financials and deal terms to get runway, ownership, MOIC and IRR, Bear/Base/Bull cases, risk flags, and how often comparable rounds raised again within its runway (from real Form D data). Save it to compare companies or write a memo."
      />
      <div className="mt-6 min-w-0">
        <AnalyzeStartupForm />
      </div>
    </PageShell>
  );
}
