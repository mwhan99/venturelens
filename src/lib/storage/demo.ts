import { buildDemoCompanies, demoCompanyNames } from "@/data/demo-dataset";
import {
  findSavedCompanyByName,
  readSavedCompanies,
  upsertSavedCompanies,
  type SavedCompany,
} from "@/lib/storage/companies";

export function findMatchingDemoCompanies() {
  const saved = readSavedCompanies();
  return demoCompanyNames.filter((name) => findSavedCompanyByName(name, saved));
}

export function loadDemoDataset() {
  const existing = readSavedCompanies();
  const now = new Date().toISOString();
  const records: SavedCompany[] = buildDemoCompanies().map((company) => {
    const match = findSavedCompanyByName(company.profile.companyName, existing);
    return {
      ...company,
      id: match?.id ?? crypto.randomUUID(),
      dateAnalyzed: now,
    };
  });

  upsertSavedCompanies(records);
  return records;
}
