import type { Metadata } from "next";
import { DashboardSummaryCards } from "@/components/dashboard/DashboardSummaryCards";
import { PageHeader, PageShell } from "@/components/PageChrome";
import { LoadDemoDataset } from "@/components/portfolio/LoadDemoDataset";
import { PortfolioList } from "@/components/portfolio/PortfolioList";

export const metadata: Metadata = { title: "Portfolio" };

export default function PortfolioPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Portfolio"
        title="Saved companies"
        description="Review startups stored in this browser after a completed analysis."
      />
      <section className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardSummaryCards />
      </section>
      <div className="mt-6 min-w-0 space-y-6">
        <LoadDemoDataset />
        <PortfolioList />
      </div>
    </PageShell>
  );
}
