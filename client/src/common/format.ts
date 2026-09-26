/** formatNumber(1234.5) -> "1,235" */
export function formatNumber(
  number: number,
  fractionDigits: number = 0,
): string {
  return number.toLocaleString('en-US', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
}

/** formatNumberScale(2500000) -> "2.5M" */
export function formatNumberScale(number: number): string {
  return number > 1000000
    ? (number / 1000000).toFixed(1) + 'M'
    : number > 1000
      ? (number / 1000) + 'K'
      : formatNumber(number);
}

/** formatMaybe(null, formatNumber) -> "—" */
export function formatMaybe(
  value: number | null,
  formatValue: (value: number) => string,
): string {
  return value == null ? '—' : formatValue(value);
}

/** formatIsk(1500000) -> "1.50M" */
export function formatIsk(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs >= 1e12) {
    return `${sign}${(abs / 1e12).toFixed(2)}T`;
  }
  if (abs >= 1e9) {
    return `${sign}${(abs / 1e9).toFixed(2)}B`;
  }
  if (abs >= 1e6) {
    return `${sign}${(abs / 1e6).toFixed(2)}M`;
  }
  if (abs >= 1e3) {
    return `${sign}${(abs / 1e3).toFixed(1)}K`;
  }
  if (abs >= 100) {
    return formatNumber(value, 0);
  }
  return formatNumber(value, 2);
}

/** formatShare(0.123) -> "12.3%" */
export function formatShare(fraction: number): string {
  return `${formatNumber(fraction * 100, 1)}%`;
}

/** formatSignedPercent(0.123) -> "+12.3%" */
export function formatSignedPercent(fraction: number): string {
  return `${fraction > 0 ? '+' : ''}${formatShare(fraction)}`;
}

/** formatPercentPoints(12.34) -> "12.3%" */
export function formatPercentPoints(value: number, fractionDigits = 1): string {
  return `${formatNumber(value, fractionDigits)}%`;
}
