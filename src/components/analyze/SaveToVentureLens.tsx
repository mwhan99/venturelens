"use client";

import { useState } from "react";
import type { AnalysisInputs, AnalysisResults } from "@/lib/finance/engine";
import {
  findSavedCompanyByName,
  saveCompany,
  type SavedCompany,
} from "@/lib/storage/companies";

type SaveDraft = {
  profile: SavedCompany["profile"];
  financialInputs: SavedCompany["financialInputs"];
  businessRiskData: SavedCompany["businessRiskData"];
  calculatedMetrics: AnalysisResults;
};

export function SaveToVentureLens({ draft }: { draft: SaveDraft }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingReplace, setPendingReplace] = useState<SavedCompany | null>(
    null,
  );

  function persist(existingId?: string) {
    saveCompany({
      id: existingId,
      profile: draft.profile,
      financialInputs: draft.financialInputs,
      businessRiskData: draft.businessRiskData,
      calculatedMetrics: draft.calculatedMetrics,
    });
    setPendingReplace(null);
    setError(null);
    setMessage("Company saved to VentureLens.");
  }

  function handleSave() {
    if (!draft.profile.companyName.trim()) {
      setMessage(null);
      setError("Enter a company name before saving.");
      return;
    }

    const existing = findSavedCompanyByName(draft.profile.companyName);
    if (existing) {
      setMessage(null);
      setError(null);
      setPendingReplace(existing);
      return;
    }

    persist();
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Save to VentureLens
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Store this analysis in the local portfolio for later review.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex h-10 items-center justify-center rounded-md bg-[#1f8a70] px-4 text-sm font-medium text-white transition-colors hover:bg-[#18735d]"
        >
          Save to VentureLens
        </button>
      </div>

      {pendingReplace ? (
        <div
          role="dialog"
          aria-labelledby="replace-company-title"
          className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3"
        >
          <p
            id="replace-company-title"
            className="text-sm font-medium text-amber-950"
          >
            A company named {pendingReplace.profile.companyName} is already
            saved.
          </p>
          <p className="mt-1 text-sm text-amber-900">
            Replace the existing record with this analysis? This will not create
            a duplicate.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => persist(pendingReplace.id)}
              className="inline-flex h-9 items-center rounded-md bg-[#1f8a70] px-3 text-sm font-medium text-white hover:bg-[#18735d]"
            >
              Replace existing
            </button>
            <button
              type="button"
              onClick={() => setPendingReplace(null)}
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
      {error ? (
        <p role="alert" className="mt-4 text-sm text-amber-800">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export function createSaveDraft({
  companyName,
  industry,
  stage,
  inputs,
  grossMargin,
  customerCount,
  largestCustomerRevenue,
  totalAddressableMarket,
  results,
}: {
  companyName: string;
  industry: string;
  stage: string;
  inputs: AnalysisInputs;
  grossMargin: number | null;
  customerCount: number | null;
  largestCustomerRevenue: number | null;
  totalAddressableMarket: number | null;
  results: AnalysisResults;
}): SaveDraft {
  return {
    profile: {
      companyName,
      industry,
      stage,
    },
    financialInputs: {
      ...inputs,
      grossMargin,
    },
    businessRiskData: {
      customerCount,
      largestCustomerRevenue,
      totalAddressableMarket,
    },
    calculatedMetrics: results,
  };
}
