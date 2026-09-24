import { badgeBaseClass } from "@/components/PageChrome";
import { isSimulatedCompany, type SavedCompany } from "@/lib/storage/companies";

export function SimulatedBadge({ company }: { company: SavedCompany }) {
  if (!isSimulatedCompany(company)) {
    return null;
  }

  return (
    <span
      className={`${badgeBaseClass} border border-amber-200 bg-amber-50 text-amber-800`}
    >
      Simulated
    </span>
  );
}
