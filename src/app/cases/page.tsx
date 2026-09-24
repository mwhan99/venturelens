import Link from "next/link";
import { PageHeader, PageShell } from "@/components/PageChrome";

export default function CasesPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Historical Cases"
        title="Historical Case Intelligence"
        description="Sourced historical cases appear on saved company records when selected risk patterns match the prototype library. Similarity does not imply the same outcome."
      />
      <div className="mt-8 rounded-lg border border-slate-200 bg-white px-6 py-16 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <p className="text-sm font-medium text-slate-800">
          Open a saved company to view matched cases
        </p>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
          Historical Case Intelligence is shown on the company detail page after
          a startup has been analyzed and saved.
        </p>
        <Link
          href="/portfolio"
          className="mt-5 inline-flex h-10 items-center rounded-md bg-[#1f8a70] px-4 text-sm font-medium text-white hover:bg-[#18735d]"
        >
          Open Portfolio
        </Link>
      </div>
    </PageShell>
  );
}
