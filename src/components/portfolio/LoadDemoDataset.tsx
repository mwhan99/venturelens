"use client";

import { useState } from "react";
import {
  findMatchingDemoCompanies,
  loadDemoDataset,
} from "@/lib/storage/demo";

export function LoadDemoDataset() {
  const [confirming, setConfirming] = useState(false);
  const [matchingNames, setMatchingNames] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  function startLoad() {
    setMessage(null);
    setMatchingNames(findMatchingDemoCompanies());
    setConfirming(true);
  }

  function confirmLoad() {
    const loaded = loadDemoDataset();
    setConfirming(false);
    setMessage(
      `Loaded ${loaded.length} simulated startups into VentureLens. These companies are simulated and are not real investment opportunities.`,
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Load Demo Dataset
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Load 10 simulated startups for exploring VentureLens features.
          </p>
        </div>
        <button
          type="button"
          onClick={startLoad}
          className="inline-flex h-10 w-full shrink-0 items-center justify-center rounded-md bg-[#1f8a70] px-4 text-sm font-medium text-white hover:bg-[#18735d] sm:w-auto"
        >
          Load Demo Dataset
        </button>
      </div>

      {confirming ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-950">
            This dataset is simulated.
          </p>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            The 10 startups were created for product demonstration only. They
            are not real companies and do not represent real market data or
            investment opportunities.
          </p>
          {matchingNames.length > 0 ? (
            <p className="mt-2 text-sm leading-6 text-amber-900">
              {matchingNames.join(", ")} {matchingNames.length === 1 ? "is" : "are"}{" "}
              already saved. Loading will replace {matchingNames.length === 1 ? "it" : "them"}{" "}
              with the standardized simulated version and will not create
              duplicates. Other saved companies will not be deleted.
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={confirmLoad}
              className="inline-flex h-9 items-center rounded-md bg-[#1f8a70] px-3 text-sm font-medium text-white hover:bg-[#18735d]"
            >
              Load simulated dataset
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {message ? (
        <p role="status" className="mt-4 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}
    </section>
  );
}
