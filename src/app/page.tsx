import Link from "next/link";
import { DashboardSummaryCards } from "@/components/dashboard/DashboardSummaryCards";
import { PageHeader, PageShell } from "@/components/PageChrome";
import { RecentStartups } from "@/components/RecentStartups";

export default function DashboardPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Dashboard"
        title="Startup investment intelligence, structured."
        description="Screen, analyze, and compare startup opportunities through standardized financial and risk analysis."
        action={
          <Link
            href="/analyze"
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-[#1f8a70] px-4 text-sm font-medium text-white transition-colors hover:bg-[#18735d] sm:w-auto"
          >
            Analyze New Startup
          </Link>
        }
      />

      <section className="mt-8 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardSummaryCards />
      </section>

      <div className="mt-8 min-w-0">
        <RecentStartups />
      </div>
    </PageShell>
  );
}
