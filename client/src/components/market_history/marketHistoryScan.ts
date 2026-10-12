import { MarketHistoryScanRes } from '@internal/shared';

export const SCAN_WINDOWS = [7, 30, 90] as const;
export type ScanWindowDays = typeof SCAN_WINDOWS[number];

export type ScanRow = {
  typeId: number;
  name: string;
  categoryId: number | null;
  categoryName: string;
  windowDays: number;
  priceChange: number | null;
  medianUnits: number;
  medianIsk: number;
  medianOrders: number;
  daysTraded: number;
  daysShare: number;
  medianRange: number | null;
};

type ScanFilters = {
  categoryName: string;
  minDaysShare: number | null;
  minIsk: number | null;
  minRange: number | null;
  search: string;
};

export function rowsForWindow(data: MarketHistoryScanRes, windowDays: ScanWindowDays): ScanRow[] {
  const rows: ScanRow[] = [];
  for (const item of data.items) {
    const window = item.windows.find((entry) => entry.windowDays === windowDays);
    if (window == null) {
      continue;
    }
    rows.push({
      typeId: item.typeId,
      name: item.name,
      categoryId: item.categoryId,
      categoryName: item.categoryName ?? 'Unknown',
      windowDays,
      priceChange: window.priceChange,
      medianUnits: window.medianUnits,
      medianIsk: window.medianIsk,
      medianOrders: window.medianOrders,
      daysTraded: window.daysTraded,
      daysShare: window.daysTraded / windowDays,
      medianRange: window.medianRange,
    });
  }
  return rows;
}

export function categoryNames(rows: ScanRow[]): string[] {
  const names = new Set(rows.map((row) => row.categoryName));
  return ['All', ...Array.from(names).sort((left, right) => left.localeCompare(right))];
}

export function filterScanRows(rows: ScanRow[], filters: ScanFilters): ScanRow[] {
  const needle = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (filters.categoryName !== 'All' && row.categoryName !== filters.categoryName) {
      return false;
    }
    if (filters.minDaysShare != null && row.daysShare < filters.minDaysShare) {
      return false;
    }
    if (filters.minIsk != null && row.medianIsk < filters.minIsk) {
      return false;
    }
    if (filters.minRange != null && (row.medianRange == null || row.medianRange < filters.minRange)) {
      return false;
    }
    if (needle !== '' && !row.name.toLowerCase().includes(needle)) {
      return false;
    }
    return true;
  });
}

function parseFloor(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') {
    return null;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/** `1000` means 1 billion ISK. Empty text means no floor. */
export function parseIskMillions(text: string): number | null {
  const value = parseFloor(text);
  return value == null ? null : value * 1_000_000;
}
export function parsePercent(text: string): number | null {
  const value = parseFloor(text);
  return value == null ? null : value / 100;
}
