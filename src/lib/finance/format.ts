const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return currencyFormatter.format(value);
}

export function formatScenarioCurrency(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }

  const roundedToCent = Math.round(value * 100) / 100;
  const isWholeDollar =
    Math.abs(roundedToCent - Math.round(roundedToCent)) < 1e-9;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: isWholeDollar ? 0 : 2,
    maximumFractionDigits: isWholeDollar ? 0 : 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return `${(value * 100).toFixed(2)}%`;
}

export function formatCompactPercent(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }

  const percent = value * 100;
  if (Math.abs(percent - Math.round(percent)) < 1e-9) {
    return `${Math.round(percent)}%`;
  }

  return `${percent.toFixed(2)}%`;
}

export function formatPercentagePoints(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return value.toFixed(2);
}

export function formatMoic(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return `${value.toFixed(2)}x`;
}

export function formatRunwayMonths(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }

  const rounded =
    Math.abs(value - Math.round(value)) < 1e-9
      ? Math.round(value).toString()
      : value.toFixed(2);

  return `${rounded} months`;
}
