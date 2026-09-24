"use client";

import { useSyncExternalStore } from "react";
import {
  getCompaniesSnapshot,
  getServerCompaniesSnapshot,
  subscribeToCompanies,
} from "@/lib/storage/companies";

export function useSavedCompanies() {
  return useSyncExternalStore(
    subscribeToCompanies,
    getCompaniesSnapshot,
    getServerCompaniesSnapshot,
  );
}

export function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function useSavedCompanyCount() {
  const isClient = useIsClient();
  const companies = useSavedCompanies();
  return isClient ? companies.length : 0;
}
