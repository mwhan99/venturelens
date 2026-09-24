export function parseNumericInput(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== "string") {
    return null;
  }

  const cleaned = raw.replace(/[$,%\s,]/g, "").trim();
  if (!cleaned) {
    return null;
  }

  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function parsePercentInput(
  raw: FormDataEntryValue | null,
): number | null {
  const value = parseNumericInput(raw);
  if (value === null) {
    return null;
  }

  return value / 100;
}
