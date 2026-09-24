"use client";

import type { HTMLAttributes, ReactNode } from "react";

type FieldBaseProps = {
  id: string;
  label: string;
  hint?: string;
};

const controlClass =
  "h-11 w-full min-w-0 max-w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#1f8a70] focus:ring-2 focus:ring-[#1f8a70]/15";

export function TextField({
  id,
  label,
  hint,
  placeholder,
  type = "text",
  inputMode,
}: FieldBaseProps & {
  placeholder: string;
  type?: "text" | "number";
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
      <input
        id={id}
        name={id}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        className={`mt-2 ${controlClass}`}
      />
    </div>
  );
}

export function SelectField({
  id,
  label,
  hint,
  placeholder,
  options,
}: FieldBaseProps & {
  placeholder: string;
  options: readonly string[];
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
      <div className="relative mt-2">
        <select
          id={id}
          name={id}
          defaultValue=""
          className={`appearance-none pr-10 ${controlClass}`}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
          <svg viewBox="0 0 12 8" className="h-3 w-3" aria-hidden="true">
            <path
              d="M1 1.5 6 6.5 11 1.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}

export function AffixedField({
  id,
  label,
  hint,
  placeholder,
  prefix,
  suffix,
}: FieldBaseProps & {
  placeholder: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
      <div className="mt-2 flex h-11 overflow-hidden rounded-md border border-slate-200 bg-white focus-within:border-[#1f8a70] focus-within:ring-2 focus-within:ring-[#1f8a70]/15">
        {prefix ? (
          <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 font-mono text-sm text-slate-500">
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          name={id}
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        {suffix ? (
          <span className="flex items-center border-l border-slate-200 bg-slate-50 px-3 font-mono text-sm text-slate-500">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function FormSection({
  step,
  title,
  description,
  children,
}: {
  step: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
          {step}
        </p>
        <h2 className="mt-1 text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="grid gap-5 px-5 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        {children}
      </div>
    </section>
  );
}
