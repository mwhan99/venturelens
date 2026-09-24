import type { AnalysisInputs, AnalysisResults } from "@/lib/finance/engine";

export const COMPANIES_STORAGE_KEY = "venturelens.companies.v1";
export const COMPANIES_CHANGED_EVENT = "venturelens:companies-changed";

export type CompanySource = "Simulated" | "Public Data" | "Analyst Assumption";

export type SavedCompanyProfile = {
  companyName: string;
  industry: string;
  stage: string;
};

export type SavedCompany = {
  id: string;
  dateAnalyzed: string;
  source?: CompanySource;
  profile: SavedCompanyProfile;
  financialInputs: AnalysisInputs & {
    grossMargin: number | null;
  };
  businessRiskData: {
    customerCount: number | null;
    largestCustomerRevenue: number | null;
    totalAddressableMarket: number | null;
  };
  calculatedMetrics: AnalysisResults;
};

export function isSimulatedCompany(company: SavedCompany) {
  return company.source === "Simulated";
}

const EMPTY_COMPANIES: SavedCompany[] = [];
let companiesSnapshot: SavedCompany[] = EMPTY_COMPANIES;
let hydrated = false;

function parseStoredCompanies(): SavedCompany[] {
  if (typeof window === "undefined") {
    return EMPTY_COMPANIES;
  }

  try {
    const raw = window.localStorage.getItem(COMPANIES_STORAGE_KEY);
    if (!raw) {
      return EMPTY_COMPANIES;
    }

    const parsed = JSON.parse(raw) as SavedCompany[];
    return Array.isArray(parsed) ? parsed : EMPTY_COMPANIES;
  } catch {
    return EMPTY_COMPANIES;
  }
}

function notifyCompaniesChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(COMPANIES_CHANGED_EVENT));
}

function hydrateFromStorage() {
  if (hydrated || typeof window === "undefined") {
    return;
  }

  companiesSnapshot = parseStoredCompanies();
  hydrated = true;
}

export function getCompaniesSnapshot(): SavedCompany[] {
  return companiesSnapshot;
}

export function getServerCompaniesSnapshot(): SavedCompany[] {
  return EMPTY_COMPANIES;
}

export function subscribeToCompanies(listener: () => void) {
  hydrateFromStorage();

  const refresh = () => {
    companiesSnapshot = parseStoredCompanies();
    hydrated = true;
    listener();
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key && event.key !== COMPANIES_STORAGE_KEY) {
      return;
    }
    refresh();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(COMPANIES_CHANGED_EVENT, refresh);
  queueMicrotask(listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(COMPANIES_CHANGED_EVENT, refresh);
  };
}

export function readSavedCompanies(): SavedCompany[] {
  hydrateFromStorage();
  return companiesSnapshot;
}

function writeSavedCompanies(companies: SavedCompany[]) {
  companiesSnapshot = companies;
  hydrated = true;
  window.localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(companies));
  notifyCompaniesChanged();
}

export function normalizeCompanyName(name: string) {
  return name.trim().toLowerCase();
}

export function findSavedCompanyByName(
  name: string,
  companies = readSavedCompanies(),
) {
  const normalized = normalizeCompanyName(name);
  if (!normalized) {
    return undefined;
  }

  return companies.find(
    (company) =>
      normalizeCompanyName(company.profile.companyName) === normalized,
  );
}

export function getSavedCompany(id: string) {
  return readSavedCompanies().find((company) => company.id === id);
}

export function countSavedCompanies() {
  return readSavedCompanies().length;
}

export function saveCompany(
  company: Omit<SavedCompany, "id" | "dateAnalyzed"> & {
    id?: string;
  },
) {
  const companies = readSavedCompanies();
  const now = new Date().toISOString();
  const existingIndex = company.id
    ? companies.findIndex((item) => item.id === company.id)
    : -1;

  const nextCompany: SavedCompany = {
    ...company,
    id: company.id ?? crypto.randomUUID(),
    dateAnalyzed: now,
  };

  if (existingIndex >= 0) {
    companies[existingIndex] = nextCompany;
  } else {
    companies.unshift(nextCompany);
  }

  writeSavedCompanies(companies);
  return nextCompany;
}

export function upsertSavedCompanies(records: SavedCompany[]) {
  const companies = [...readSavedCompanies()];
  const newcomers: SavedCompany[] = [];

  for (const record of records) {
    const byId = record.id
      ? companies.findIndex((item) => item.id === record.id)
      : -1;
    if (byId >= 0) {
      companies[byId] = record;
      continue;
    }

    const existing = findSavedCompanyByName(
      record.profile.companyName,
      companies,
    );
    if (existing) {
      const index = companies.findIndex((item) => item.id === existing.id);
      companies[index] = { ...record, id: existing.id };
      continue;
    }

    newcomers.push(record);
  }

  writeSavedCompanies([...newcomers, ...companies]);
}

export function deleteSavedCompany(id: string) {
  writeSavedCompanies(
    readSavedCompanies().filter((company) => company.id !== id),
  );
}

export function formatAnalyzedDate(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
