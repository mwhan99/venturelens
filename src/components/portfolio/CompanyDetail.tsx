"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { RiskAssessment } from "@/components/analyze/RiskAssessment";
import { HistoricalCaseIntelligence } from "@/components/portfolio/HistoricalCaseIntelligence";
import { assessCompanyRiskFlags } from "@/lib/cases/match";
import { SimulatedBadge } from "@/components/SimulatedBadge";
import {
  formatCompactPercent,
  formatCurrency,
  formatMoic,
  formatPercent,
  formatRunwayMonths,
} from "@/lib/finance/format";
import {
  deleteSavedCompany,
  formatAnalyzedDate,
} from "@/lib/storage/companies";
import {
  useIsClient,
  useSavedCompanies,
} from "@/lib/storage/useSavedCompanyCount";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-4 px-5 py-3 sm:px-6">
      <dt className="min-w-0 text-sm text-slate-600">{label}</dt>
      <dd className="shrink-0 break-all font-mono text-sm font-medium text-slate-900">
        {value}
      </dd>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <h2 className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900 sm:px-6">
        {title}
      </h2>
      <dl className="divide-y divide-slate-100">{children}</dl>
    </section>
  );
}

function optionalNumber(value: number | null, format: (value: number) => string) {
  return value === null ? "—" : format(value);
}

export function CompanyDetail({ id }: { id: string }) {
  const router = useRouter();
  const isClient = useIsClient();
  const companies = useSavedCompanies();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const company = companies.find((item) => item.id === id) ?? null;

  if (!isClient) {
    return (
      <p className="text-sm text-slate-500">Loading saved company…</p>
    );
  }

  if (company === null) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <p className="text-sm font-medium text-slate-800">Company not found</p>
        <p className="mt-1 text-sm text-slate-500">
          This record is not in the local VentureLens portfolio.
        </p>
        <Link
          href="/portfolio"
          className="mt-5 inline-flex h-10 items-center rounded-md bg-[#1f8a70] px-4 text-sm font-medium text-white hover:bg-[#18735d]"
        >
          Back to Portfolio
        </Link>
      </div>
    );
  }

  const companyId = company.id;
  const companyName = company.profile.companyName;

  function handleDelete() {
    deleteSavedCompany(companyId);
    router.push("/portfolio");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/portfolio"
            className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 hover:text-slate-700"
          >
            Portfolio
          </Link>
          <h1 className="mt-2 flex min-w-0 flex-wrap items-center gap-3 break-words text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {company.profile.companyName}
            <SimulatedBadge company={company} />
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Analyzed {formatAnalyzedDate(company.dateAnalyzed)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="inline-flex h-10 w-full shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:border-rose-200 hover:text-rose-700 sm:w-auto"
        >
          Delete company
        </button>
      </div>

      {confirmDelete ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-medium text-rose-950">
            Delete {companyName} from VentureLens?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex h-9 items-center rounded-md bg-rose-700 px-3 text-sm font-medium text-white hover:bg-rose-800"
            >
              Delete company
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <DetailSection title="Company Profile">
          <DetailRow label="Company Name" value={company.profile.companyName} />
          <DetailRow label="Industry" value={company.profile.industry || "—"} />
          <DetailRow label="Stage" value={company.profile.stage || "—"} />
        </DetailSection>

        <DetailSection title="Financial Inputs">
          <DetailRow
            label="Current Revenue"
            value={formatCurrency(company.financialInputs.currentRevenue)}
          />
          <DetailRow
            label="Revenue Growth"
            value={formatCompactPercent(company.financialInputs.revenueGrowth)}
          />
          <DetailRow
            label="Gross Margin"
            value={optionalNumber(
              company.financialInputs.grossMargin,
              formatCompactPercent,
            )}
          />
          <DetailRow
            label="Annual Burn"
            value={formatCurrency(company.financialInputs.annualBurn)}
          />
          <DetailRow
            label="Cash Balance"
            value={formatCurrency(company.financialInputs.cashBalance)}
          />
        </DetailSection>

        <DetailSection title="Investment Terms">
          <DetailRow
            label="Investment Amount"
            value={formatCurrency(company.financialInputs.investmentAmount)}
          />
          <DetailRow
            label="Pre-Money Valuation"
            value={formatCurrency(company.financialInputs.preMoneyValuation)}
          />
          <DetailRow
            label="Investment Horizon"
            value={`${company.financialInputs.investmentHorizon} years`}
          />
          <DetailRow
            label="Expected Exit Revenue Multiple"
            value={`${company.financialInputs.expectedExitRevenueMultiple}x`}
          />
          <DetailRow
            label="Expected Future Dilution"
            value={formatCompactPercent(
              company.financialInputs.expectedFutureDilution,
            )}
          />
        </DetailSection>

        <DetailSection title="Business Risk Data">
          <DetailRow
            label="Customer Count"
            value={
              company.businessRiskData.customerCount === null
                ? "—"
                : String(company.businessRiskData.customerCount)
            }
          />
          <DetailRow
            label="Largest Customer Revenue"
            value={optionalNumber(
              company.businessRiskData.largestCustomerRevenue,
              formatCompactPercent,
            )}
          />
          <DetailRow
            label="Total Addressable Market"
            value={optionalNumber(
              company.businessRiskData.totalAddressableMarket,
              formatCurrency,
            )}
          />
        </DetailSection>
      </div>

      <DetailSection title="Calculated Metrics">
        <DetailRow
          label="Monthly Burn"
          value={formatCurrency(company.calculatedMetrics.monthlyBurn)}
        />
        <DetailRow
          label="Runway"
          value={formatRunwayMonths(company.calculatedMetrics.runwayMonths)}
        />
        <DetailRow
          label="Post-Money Valuation"
          value={formatCurrency(company.calculatedMetrics.postMoneyValuation)}
        />
        <DetailRow
          label="Initial Investor Ownership"
          value={formatPercent(company.calculatedMetrics.initialInvestorOwnership)}
        />
        <DetailRow
          label="Diluted Investor Ownership"
          value={formatPercent(company.calculatedMetrics.dilutedInvestorOwnership)}
        />
        <DetailRow
          label="Projected Exit Revenue"
          value={formatCurrency(company.calculatedMetrics.projectedExitRevenue)}
        />
        <DetailRow
          label="Projected Exit Valuation"
          value={formatCurrency(company.calculatedMetrics.projectedExitValuation)}
        />
        <DetailRow
          label="Investor Exit Proceeds"
          value={formatCurrency(company.calculatedMetrics.investorExitProceeds)}
        />
        <DetailRow
          label="Modeled MOIC"
          value={formatMoic(company.calculatedMetrics.moic)}
        />
        <DetailRow
          label="Modeled IRR"
          value={formatPercent(company.calculatedMetrics.irr)}
        />
      </DetailSection>

      <RiskAssessment flags={assessCompanyRiskFlags(company)} />

      <HistoricalCaseIntelligence company={company} />
    </div>
  );
}
