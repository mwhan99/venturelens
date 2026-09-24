import { PageHeader, PageShell } from "@/components/PageChrome";
import { LoadDemoDataset } from "@/components/portfolio/LoadDemoDataset";
import { PortfolioList } from "@/components/portfolio/PortfolioList";

export default function PortfolioPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Portfolio"
        title="Saved companies"
        description="Review startups stored in this browser after a completed analysis."
      />
      <div className="mt-8 min-w-0 space-y-6">
        <LoadDemoDataset />
        <PortfolioList />
      </div>
    </PageShell>
  );
}
