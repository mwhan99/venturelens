import { CompanyDetail } from "@/components/portfolio/CompanyDetail";
import { PageShell } from "@/components/PageChrome";

export default async function CompanyDetailPage({
  params,
}: PageProps<"/portfolio/[id]">) {
  const { id } = await params;

  return (
    <PageShell>
      <CompanyDetail id={id} />
    </PageShell>
  );
}
