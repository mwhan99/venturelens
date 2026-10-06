"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import {
  AffixedField,
  FormSection,
  SelectField,
  TextField,
} from "@/components/analyze/FormFields";
import { FinancialAnalysisResults } from "@/components/analyze/FinancialAnalysisResults";
import { RiskAssessment } from "@/components/analyze/RiskAssessment";
import {
  createSaveDraft,
  SaveToVentureLens,
} from "@/components/analyze/SaveToVentureLens";
import { ScenarioAnalysis } from "@/components/analyze/ScenarioAnalysis";
import { industries, stages } from "@/data/form-options";
import {
  calculateFinancialAnalysis,
  type AnalysisInputs,
  type AnalysisResults,
} from "@/lib/finance/engine";
import { parseNumericInput, parsePercentInput } from "@/lib/finance/parse";
import { assessRiskFlags } from "@/lib/finance/risk";
import {
  buildScenarioDrafts,
  calculateScenario,
  resolveScenarioAssumption,
  type ScenarioDraft,
  type ScenarioId,
} from "@/lib/finance/scenarios";

export function AnalyzeStartupForm() {
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [stage, setStage] = useState("");
  const [inputs, setInputs] = useState<AnalysisInputs | null>(null);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [grossMargin, setGrossMargin] = useState<number | null>(null);
  const [customerCount, setCustomerCount] = useState<number | null>(null);
  const [largestCustomerRevenue, setLargestCustomerRevenue] = useState<
    number | null
  >(null);
  const [totalAddressableMarket, setTotalAddressableMarket] = useState<
    number | null
  >(null);
  const [scenarioDrafts, setScenarioDrafts] = useState<
    Record<ScenarioId, ScenarioDraft>
  >({
    bear: { revenueGrowth: "", exitRevenueMultiple: "", futureDilution: "" },
    base: { revenueGrowth: "", exitRevenueMultiple: "", futureDilution: "" },
    bull: { revenueGrowth: "", exitRevenueMultiple: "", futureDilution: "" },
  });
  const resultsRef = useRef<HTMLDivElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const currentRevenue = parseNumericInput(
      formData.get("currentAnnualRevenue"),
    );
    const revenueGrowth = parsePercentInput(formData.get("revenueGrowth"));
    const annualBurn = parseNumericInput(formData.get("annualBurn"));
    const cashBalance = parseNumericInput(formData.get("cashBalance"));
    const investmentAmount = parseNumericInput(
      formData.get("investmentAmount"),
    );
    const preMoneyValuation = parseNumericInput(
      formData.get("preMoneyValuation"),
    );
    const investmentHorizon = parseNumericInput(
      formData.get("investmentHorizon"),
    );
    const expectedExitRevenueMultiple = parseNumericInput(
      formData.get("expectedExitRevenueMultiple"),
    );
    const expectedFutureDilution = parsePercentInput(
      formData.get("expectedFutureDilution"),
    );

    if (
      currentRevenue === null ||
      revenueGrowth === null ||
      annualBurn === null ||
      cashBalance === null ||
      investmentAmount === null ||
      preMoneyValuation === null ||
      investmentHorizon === null ||
      expectedExitRevenueMultiple === null ||
      expectedFutureDilution === null
    ) {
      setResults(null);
      setInputs(null);
      setGrossMargin(null);
      setCustomerCount(null);
      setLargestCustomerRevenue(null);
      setTotalAddressableMarket(null);
      setError(
        "Enter all financial performance and investment term fields before analyzing.",
      );
      return;
    }

    const nextInputs = {
      currentRevenue,
      revenueGrowth,
      annualBurn,
      cashBalance,
      investmentAmount,
      preMoneyValuation,
      investmentHorizon,
      expectedExitRevenueMultiple,
      expectedFutureDilution,
    };
    const nextResults = calculateFinancialAnalysis(nextInputs);

    setError(null);
    setCompanyName(String(formData.get("companyName") ?? "").trim());
    setIndustry(String(formData.get("industry") ?? "").trim());
    setStage(String(formData.get("stage") ?? "").trim());
    setInputs(nextInputs);
    setResults(nextResults);
    setGrossMargin(parsePercentInput(formData.get("grossMargin")));
    setCustomerCount(parseNumericInput(formData.get("customerCount")));
    setLargestCustomerRevenue(
      parsePercentInput(formData.get("largestCustomerRevenue")),
    );
    setTotalAddressableMarket(
      parseNumericInput(formData.get("totalAddressableMarket")),
    );
    setScenarioDrafts(buildScenarioDrafts(nextInputs));
    window.requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const riskFlags = useMemo(() => {
    if (!inputs || !results) {
      return [];
    }

    const bear = resolveScenarioAssumption(inputs, "bear", scenarioDrafts.bear);
    const bull = resolveScenarioAssumption(inputs, "bull", scenarioDrafts.bull);

    return assessRiskFlags({
      analysisInputs: inputs,
      analysisResults: results,
      grossMargin,
      largestCustomerRevenue,
      bearIrr: bear ? calculateScenario(inputs, bear).irr : null,
      bullIrr: bull ? calculateScenario(inputs, bull).irr : null,
    });
  }, [grossMargin, inputs, largestCustomerRevenue, results, scenarioDrafts]);

  return (
    <div className="space-y-6">
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSection
        step="Section 1"
        title="Company Profile"
        description="Identify the company and position it by industry and financing stage."
      >
        <TextField
          id="companyName"
          label="Company Name"
          placeholder="Helios Robotics"
        />
        <SelectField
          id="industry"
          label="Industry"
          placeholder="Select industry"
          options={industries}
        />
        <SelectField
          id="stage"
          label="Stage"
          placeholder="Select stage"
          options={stages}
        />
      </FormSection>

      <FormSection
        step="Section 2"
        title="Financial Performance"
        description="Enter current operating metrics used in later screening models."
      >
        <AffixedField
          id="currentAnnualRevenue"
          label="Current Annual Revenue"
          hint="Trailing twelve months"
          prefix="$"
          placeholder="4,800,000"
        />
        <AffixedField
          id="revenueGrowth"
          label="Revenue Growth"
          hint="Year over year"
          suffix="%"
          placeholder="86"
        />
        <AffixedField
          id="grossMargin"
          label="Gross Margin"
          suffix="%"
          placeholder="72"
        />
        <AffixedField
          id="annualBurn"
          label="Annual Burn"
          prefix="$"
          placeholder="3,200,000"
        />
        <AffixedField
          id="cashBalance"
          label="Cash Balance"
          prefix="$"
          placeholder="6,100,000"
        />
      </FormSection>

      <FormSection
        step="Section 3"
        title="Investment Terms"
        description="Capture the proposed round structure and underwriting assumptions."
      >
        <AffixedField
          id="investmentAmount"
          label="Investment Amount"
          prefix="$"
          placeholder="2,000,000"
        />
        <AffixedField
          id="preMoneyValuation"
          label="Pre-Money Valuation"
          prefix="$"
          placeholder="18,000,000"
        />
        <AffixedField
          id="investmentHorizon"
          label="Investment Horizon"
          suffix="Years"
          placeholder="7"
        />
        <AffixedField
          id="expectedExitRevenueMultiple"
          label="Expected Exit Revenue Multiple"
          suffix="x"
          placeholder="8.0"
        />
        <AffixedField
          id="expectedFutureDilution"
          label="Expected Future Dilution"
          suffix="%"
          placeholder="25"
        />
      </FormSection>

      <FormSection
        step="Section 4"
        title="Business Risk Data"
        description="Add concentration and market context for qualitative risk review."
      >
        <TextField
          id="customerCount"
          label="Customer Count"
          placeholder="42"
          inputMode="numeric"
        />
        <AffixedField
          id="largestCustomerRevenue"
          label="Largest Customer Revenue"
          hint="Share of total revenue"
          suffix="%"
          placeholder="18"
        />
        <AffixedField
          id="totalAddressableMarket"
          label="Total Addressable Market"
          prefix="$"
          placeholder="12,000,000,000"
        />
      </FormSection>

      <div className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-6">
        <button
          type="submit"
          className="inline-flex h-12 w-full items-center justify-center rounded-md bg-[#1f8a70] px-6 text-base font-semibold text-white transition-colors hover:bg-[#18735d]"
        >
          Analyze Startup
        </button>
        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"
          >
            {error}
          </p>
        ) : (
          <p className="mt-3 text-center text-xs text-slate-500">
            Results use the specified screening formulas.
          </p>
        )}
      </div>
    </form>

      {results && inputs ? (
        <div ref={resultsRef} className="space-y-6">
          <FinancialAnalysisResults
            companyName={companyName}
            results={results}
          />
          <ScenarioAnalysis
            inputs={inputs}
            drafts={scenarioDrafts}
            onDraftsChange={setScenarioDrafts}
          />
          <RiskAssessment flags={riskFlags} />
          <SaveToVentureLens
            draft={createSaveDraft({
              companyName,
              industry,
              stage,
              inputs,
              grossMargin,
              customerCount,
              largestCustomerRevenue,
              totalAddressableMarket,
              results,
            })}
          />
        </div>
      ) : null}
    </div>
  );
}
