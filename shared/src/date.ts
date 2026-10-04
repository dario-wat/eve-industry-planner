/** UTC calendar day, `YYYY-MM-DD`. */
export function toIsoDay(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value.slice(0, 10);
}

/** Adds `days` to a UTC calendar day. `isoDate` may be `YYYY-MM-DD` or a longer ISO timestamp. */
export function addIsoDays(isoDate: string, days: number): string {
  const [year, month, day] = toIsoDay(isoDate).split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utc.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Previous UTC calendar day. ESI market history leaves the current UTC day open. */
export function closedUtcDay(now = new Date()): string {
  return addIsoDays(toIsoDay(now), -1);
}
