"use client";

import { useEffect } from "react";
import { loadDemoDataset } from "@/lib/storage/demo";
import { readSavedCompanies } from "@/lib/storage/companies";

export const DEMO_SEEDED_KEY = "venturelens.demoSeeded.v1";

/**
 * On a visitor's first visit to the calculator, load the 10 simulated demo
 * companies so no page starts empty. It runs once per browser: someone who
 * deletes the demo companies doesn't get them back on the next visit (the
 * Portfolio page still has a "Load demo dataset" button).
 */
export function shouldSeedDemo(storage: Pick<Storage, "getItem">, savedCount: number) {
  return storage.getItem(DEMO_SEEDED_KEY) === null && savedCount === 0;
}

export function DemoSeeder() {
  useEffect(() => {
    try {
      if (shouldSeedDemo(window.localStorage, readSavedCompanies().length)) {
        loadDemoDataset();
      }
      window.localStorage.setItem(DEMO_SEEDED_KEY, "1");
    } catch {
      // Storage can be blocked (private modes, strict settings). The pages
      // still work; they just start empty with the "Load demo dataset" button.
    }
  }, []);
  return null;
}
