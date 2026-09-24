import { InvestmentMemoPage } from "@/components/memo/InvestmentMemoPage";
import { PageHeader, PageShell } from "@/components/PageChrome";

export default function MemoPage() {
  return (
    <PageShell width="memo">
      <PageHeader
        eyebrow="Investment Memo"
        title="Screening memorandum"
        description="A structured synthesis of saved VentureLens outputs. This memo does not recommend an investment decision."
      />
      <div className="mt-8 min-w-0 print:mt-0">
        <InvestmentMemoPage />
      </div>
    </PageShell>
  );
}
