import { addIsoDays, toIsoDay } from '@internal/shared';

export const SUMMARY_WINDOWS = [7, 30, 90] as const;

/** Longest window twice over, so price change can use the previous window. */
export const SUMMARY_HISTORY_DAYS = 90 * 2;

export type SummaryHistoryRow = {
  date: string;
  average: number;
  highest: number;
  lowest: number;
  orderCount: number;
  volume: number;
};

type MarketHistorySummaryValues = {
  regionId: number;
  typeId: number;
  windowDays: number;
  medianPrice: number | null;
  priceChange: number | null;
  medianUnits: number;
  medianIsk: number;
  medianOrders: number;
  daysTraded: number;
  medianRange: number | null;
  iskWeightedRange: number | null;
  medianPriceInRange: number | null;
  asOfDate: string;
};

type FilledDay = {
  average: number | null;
  volume: number;
  orderCount: number;
  iskVolume: number;
  rangeRatio: number | null;
  priceInRange: number | null;
};

/**
 * One summary per window that fits in the calendar ending on `endDate`.
 * Days with no trades count as zero volume. A window is omitted when the
 * series is shorter than that window.
 */
export function buildTypeSummaries(input: {
  regionId: number;
  typeId: number;
  rows: SummaryHistoryRow[];
  hasEarlierHistory: boolean;
  endDate: string;
  spanStart: string;
  windows?: readonly number[];
}): MarketHistorySummaryValues[] {
  const days = fillDays(input);
  const windows = input.windows ?? SUMMARY_WINDOWS;
  const summaries: MarketHistorySummaryValues[] = [];
  for (const windowDays of windows) {
    const summary = summarizeWindow(days, windowDays);
    if (summary === null) {
      continue;
    }
    summaries.push({
      regionId: input.regionId,
      typeId: input.typeId,
      windowDays,
      asOfDate: input.endDate,
      ...summary,
    });
  }
  return summaries;
}

function fillDays(input: {
  rows: SummaryHistoryRow[];
  hasEarlierHistory: boolean;
  endDate: string;
  spanStart: string;
}): FilledDay[] {
  if (input.rows.length === 0 && !input.hasEarlierHistory) {
    return [];
  }
  const byDate = new Map(input.rows.map((row) => [toIsoDay(row.date), row]));
  const firstRowDate = [...byDate.keys()].sort()[0];
  const start = input.hasEarlierHistory ? input.spanStart : firstRowDate;
  const days: FilledDay[] = [];
  for (let cursor = start; cursor <= input.endDate; cursor = addIsoDays(cursor, 1)) {
    const row = byDate.get(cursor);
    days.push(row === undefined ? emptyDay() : tradedDay(row));
  }
  return days;
}

function summarizeWindow(days: FilledDay[], windowDays: number): Omit<
  MarketHistorySummaryValues,
  'regionId' | 'typeId' | 'windowDays' | 'asOfDate'
> | null {
  if (days.length < windowDays) {
    return null;
  }
  const current = days.slice(-windowDays);
  const prior = days.length >= windowDays * 2
    ? days.slice(-windowDays * 2, -windowDays)
    : null;
  const medianPrice = median(numbers(current, (day) => day.average));
  const priorPrice = prior === null ? null : median(numbers(prior, (day) => day.average));
  const priceChange = medianPrice !== null && priorPrice !== null && priorPrice !== 0
    ? (medianPrice - priorPrice) / priorPrice
    : null;

  return {
    medianPrice,
    priceChange,
    medianUnits: median(current.map((day) => day.volume)) ?? 0,
    medianIsk: median(current.map((day) => day.iskVolume)) ?? 0,
    medianOrders: median(current.map((day) => day.orderCount)) ?? 0,
    daysTraded: current.filter((day) => day.average !== null).length,
    medianRange: median(numbers(current, (day) => day.rangeRatio)),
    iskWeightedRange: weightedRange(current),
    medianPriceInRange: median(numbers(current, (day) => day.priceInRange)),
  };
}

function tradedDay(row: SummaryHistoryRow): FilledDay {
  const high = row.highest;
  const low = row.lowest;
  const tradedWithPrices = high > 0 && high >= low;
  return {
    average: row.average,
    volume: row.volume,
    orderCount: row.orderCount,
    iskVolume: row.volume * row.average,
    rangeRatio: tradedWithPrices ? (high - low) / high : null,
    priceInRange: high > low ? (row.average - low) / (high - low) : null,
  };
}

function emptyDay(): FilledDay {
  return {
    average: null,
    volume: 0,
    orderCount: 0,
    iskVolume: 0,
    rangeRatio: null,
    priceInRange: null,
  };
}

function numbers(days: FilledDay[], pick: (day: FilledDay) => number | null): number[] {
  const values: number[] = [];
  days.forEach((day) => {
    const value = pick(day);
    if (value !== null && !Number.isNaN(value)) {
      values.push(value);
    }
  });
  return values;
}

function weightedRange(days: FilledDay[]): number | null {
  let weight = 0;
  let total = 0;
  days.forEach((day) => {
    if (day.rangeRatio === null || day.iskVolume <= 0) {
      return;
    }
    total += day.rangeRatio * day.iskVolume;
    weight += day.iskVolume;
  });
  return weight === 0 ? null : total / weight;
}

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}
