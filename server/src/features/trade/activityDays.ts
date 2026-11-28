import { ActivityKind, TradeActivityDayRes } from '@internal/shared';

const DAY_MS = 86_400_000;

export type ActivityDayRow = {
  day: string;
  is_buy: number | boolean;
  kind: ActivityKind;
  n: number | string;
  units: number | string;
};

/** EVE days run on UTC. */
export function utcDayStart(time: Date): Date {
  return new Date(Date.UTC(time.getUTCFullYear(), time.getUTCMonth(), time.getUTCDate()));
}

/** One entry per UTC day for the last `count` days through `now`, zeros where nothing happened. */
export function activityDays(
  rows: readonly ActivityDayRow[],
  now: Date,
  count: number,
): TradeActivityDayRes[] {
  const end = utcDayStart(now).getTime();
  const days = new Map<string, TradeActivityDayRes>();
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(end - i * DAY_MS).toISOString().slice(0, 10);
    days.set(date, {
      date,
      buy: { repriced: 0, appeared: 0, unitsTraded: 0 },
      sell: { repriced: 0, appeared: 0, unitsTraded: 0 },
    });
  }
  for (const row of rows) {
    const day = days.get(row.day);
    if (day === undefined) {
      continue;
    }
    const side = Number(row.is_buy) ? day.buy : day.sell;
    if (row.kind === 'traded') {
      side.unitsTraded += Number(row.units);
    } else {
      side[row.kind] += Number(row.n);
    }
  }
  return [...days.values()];
}
