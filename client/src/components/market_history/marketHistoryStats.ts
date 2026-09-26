import { addDays, format } from 'date-fns';
import type { MarketHistoryRes } from '@internal/shared';

export type MarketHistoryDay = {
  date: string;
  time: Date;
  average: number | null;
  low: number | null;
  high: number | null;
  /** High minus low, in ISK. Null on days with no trades. */
  rangeWidth: number | null;
  volume: number;
  orderCount: number;
  iskVolume: number;
  /** (high - low) / high. Zero when the day traded flat. Null when it did not trade. */
  rangeRatio: number | null;
  /** Where the average sat between low and high. Null when the day had no range. */
  priceInRange: number | null;
};

export type WindowSummary = {
  windowDays: number;
  medianPrice: number | null;
  /** Median price versus the previous window of the same length. */
  priceChange: number | null;
  medianUnits: number;
  medianIsk: number;
  medianOrders: number;
  daysTraded: number;
  medianRange: number | null;
  iskWeightedRange: number | null;
  medianPriceInRange: number | null;
};

type HistoryRow = MarketHistoryRes[number];

/** ESI history dates are UTC days, and the current UTC day is still open. */
export function closedUtcDay(now = new Date()): string {
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  utc.setUTCDate(utc.getUTCDate() - 1);
  const year = utc.getUTCFullYear();
  const month = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utc.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseHistoryDate(isoDate: string): Date {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * One row per calendar day from the first trade through `endDate`.
 * Days ESI omitted (no trades) are zeros for volume and orders, and null for price.
 */
export function buildMarketHistoryDays(
  history: MarketHistoryRes,
  endDate = closedUtcDay(),
): MarketHistoryDay[] {
  if (history.length === 0) {
    return [];
  }

  const byDate = new Map<string, HistoryRow>();
  history.forEach(row => {
    byDate.set(row.date.slice(0, 10), row);
  });
  const keys = Array.from(byDate.keys()).sort();
  const start = parseHistoryDate(keys[0]);
  const end = parseHistoryDate(endDate > keys[keys.length - 1] ? endDate : keys[keys.length - 1]);

  const days: MarketHistoryDay[] = [];
  for (let cursor = start; cursor.getTime() <= end.getTime(); cursor = addDays(cursor, 1)) {
    const date = format(cursor, 'yyyy-MM-dd');
    const row = byDate.get(date);
    days.push(row === undefined ? emptyDay(date, cursor) : tradedDay(date, cursor, row));
  }
  return days;
}

export function rollingMedian(
  days: MarketHistoryDay[],
  pick: (day: MarketHistoryDay) => number | null,
  window: number,
): (number | null)[] {
  return days.map((_, index) => {
    if (index < window - 1) {
      return null;
    }
    const values: number[] = [];
    for (let i = index - window + 1; i <= index; i += 1) {
      const value = pick(days[i]);
      if (value != null && !Number.isNaN(value)) {
        values.push(value);
      }
    }
    return median(values);
  });
}

/** Null when the series is shorter than the window. Price change also needs the previous window. */
export function summarizeWindow(days: MarketHistoryDay[], windowDays: number): WindowSummary | null {
  if (days.length < windowDays) {
    return null;
  }
  const current = days.slice(-windowDays);
  const prior = days.length >= windowDays * 2
    ? days.slice(-windowDays * 2, -windowDays)
    : null;
  const medianPrice = median(numbers(current, day => day.average));
  const priorPrice = prior == null ? null : median(numbers(prior, day => day.average));
  const priceChange = medianPrice != null && priorPrice != null && priorPrice !== 0
    ? (medianPrice - priorPrice) / priorPrice
    : null;

  return {
    windowDays,
    medianPrice,
    priceChange,
    medianUnits: median(current.map(day => day.volume)) ?? 0,
    medianIsk: median(current.map(day => day.iskVolume)) ?? 0,
    medianOrders: median(current.map(day => day.orderCount)) ?? 0,
    daysTraded: current.filter(day => day.average != null).length,
    medianRange: median(numbers(current, day => day.rangeRatio)),
    iskWeightedRange: weightedRange(current),
    medianPriceInRange: median(numbers(current, day => day.priceInRange)),
  };
}

function tradedDay(date: string, time: Date, row: HistoryRow): MarketHistoryDay {
  const high = row.highest;
  const low = row.lowest;
  const tradedWithPrices = high > 0 && high >= low;
  return {
    date,
    time,
    average: row.average,
    low,
    high,
    rangeWidth: tradedWithPrices ? high - low : null,
    volume: row.volume,
    orderCount: row.order_count,
    iskVolume: row.volume * row.average,
    rangeRatio: tradedWithPrices ? (high - low) / high : null,
    priceInRange: high > low ? (row.average - low) / (high - low) : null,
  };
}

function emptyDay(date: string, time: Date): MarketHistoryDay {
  return {
    date,
    time,
    average: null,
    low: null,
    high: null,
    rangeWidth: null,
    volume: 0,
    orderCount: 0,
    iskVolume: 0,
    rangeRatio: null,
    priceInRange: null,
  };
}

function numbers(days: MarketHistoryDay[], pick: (day: MarketHistoryDay) => number | null): number[] {
  const values: number[] = [];
  days.forEach(day => {
    const value = pick(day);
    if (value != null && !Number.isNaN(value)) {
      values.push(value);
    }
  });
  return values;
}

function weightedRange(days: MarketHistoryDay[]): number | null {
  let weight = 0;
  let total = 0;
  days.forEach(day => {
    if (day.rangeRatio == null || day.iskVolume <= 0) {
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
