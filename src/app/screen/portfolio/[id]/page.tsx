import type { Metadata } from "next";
import { CompanyDetail } from "@/components/portfolio/CompanyDetail";
import { PageShell } from "@/components/PageChrome";

// Companies live in the visitor's browser, so the server can't know the name.
export const metadata: Metadata = { title: "Saved company" };

export default async function CompanyDetailPage({
  params,
}: PageProps<"/screen/portfolio/[id]">) {
  const { id } = await params;

  return (
    <PageShell>
      <CompanyDetail id={id} />
    </PageShell>
  );
}
