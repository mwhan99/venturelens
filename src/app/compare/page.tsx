import { CompareStartups } from "@/components/compare/CompareStartups";
import { PageHeader, PageShell } from "@/components/PageChrome";

export default function ComparePage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Compare Startups"
        title="Side-by-side screening"
        description="Select two saved companies and review their stored financial and risk metrics together."
      />
      <div className="mt-8 min-w-0">
        <CompareStartups />
      </div>
    </PageShell>
  );
}
