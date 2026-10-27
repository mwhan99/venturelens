import Link from "next/link";
import benchmarks from "@/data/formd/benchmarks.json";
import { longDate } from "@/lib/formd/summary";

const REPO = "https://github.com/mwhan99/venturelens";

export function SiteFooter() {
  return (
    <footer className="mt-8 print:hidden">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 pb-12 pt-6 text-sm text-muted sm:flex-row sm:justify-between sm:px-6">
        <p className="max-w-2xl">
          Data: SEC Form D data sets through {longDate(benchmarks.dataset_end_date)}. A later
          filing is a lower bound on fundraising, because SAFEs, notes and some rounds never
          appear. Demo companies in the calculator are simulated.
        </p>
        <p className="flex shrink-0 gap-4">
          <Link className="hover:text-ink" href="/methodology">
            Methodology
          </Link>
          <a className="hover:text-ink" href={`${REPO}/blob/main/pipeline/FINDINGS.md`}>
            Findings
          </a>
          <a className="hover:text-ink" href={REPO}>
            GitHub
          </a>
        </p>
      </div>
    </footer>
  );
}
