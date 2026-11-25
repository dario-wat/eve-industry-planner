import { OpenOrder, OrderBookDiff } from './diffOrderBook';

const RELIST_VOLUME_TOLERANCE = 0.05;

export type CloseEvidence = {
  order: OpenOrder;
  betterOrdersBefore: number;
  betterVolumeBefore: number;
  bestPriceAfter: number | null;
  bestOppositePriceAfter: number | null;
  survivor: OpenOrder | null;
  relist: OpenOrder | null;
  pollTradedVolume: number;
  nearestTradedPrice: number | null;
  pollMissedCount: number;
};

type BookSide = { typeId: number; locationId: number; isBuy: boolean };

/** What the book looked like around each order that this poll missed for the first time. */
export function closeEvidence(
  previous: readonly OpenOrder[],
  next: readonly OpenOrder[],
  diff: OrderBookDiff,
): CloseEvidence[] {
  const keys = new Set<string>();
  for (const order of diff.missed) {
    keys.add(bookKey(order));
    keys.add(oppositeKey(order));
  }
  const wanted = (order: BookSide): boolean => keys.has(bookKey(order));

  const before = groupByBook(previous.filter((order) => !order.missing && wanted(order)));
  const after = groupByBook(next.filter(wanted));
  const appeared = groupByBook(diff.inserted.filter(wanted));
  const missed = groupByBook(diff.missed);
  const traded = groupByBook(
    diff.events.filter((event) => event.kind === 'traded' && wanted(event)),
  );

  return diff.missed.map((order) => {
    const key = bookKey(order);
    const betterBefore = (before.get(key) ?? []).filter((other) => isBetter(other, order));
    const nextHere = after.get(key) ?? [];
    const nextById = new Map(nextHere.map((other) => [other.orderId, other]));
    const survivors = betterBefore.filter((other) => {
      const now = nextById.get(other.orderId);
      return now !== undefined
        && now.price === other.price
        && now.issued === other.issued
        && reachesSameTraders(other, order);
    });
    const trades = traded.get(key) ?? [];
    return {
      order,
      betterOrdersBefore: betterBefore.length,
      betterVolumeBefore: sum(betterBefore.map((other) => other.volumeRemain)),
      bestPriceAfter: bestPrice(nextHere, order.isBuy),
      bestOppositePriceAfter: bestPrice(after.get(oppositeKey(order)) ?? [], !order.isBuy),
      survivor: survivors.reduce<OpenOrder | null>(
        (best, other) => (best === null || isBetter(other, best) ? other : best),
        null,
      ),
      relist: closestRelist(order, appeared.get(key) ?? []),
      pollTradedVolume: sum(trades.map((trade) => trade.volumeDelta ?? 0)),
      nearestTradedPrice: nearestPrice(order.price, trades.map((trade) => trade.price)),
      pollMissedCount: (missed.get(key) ?? []).length,
    };
  });
}

function bookKey(order: BookSide): string {
  return `${order.typeId}:${order.locationId}:${order.isBuy ? 1 : 0}`;
}

function oppositeKey(order: BookSide): string {
  return `${order.typeId}:${order.locationId}:${order.isBuy ? 0 : 1}`;
}

function groupByBook<T extends BookSide>(orders: readonly T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const order of orders) {
    const key = bookKey(order);
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, [order]);
    } else {
      group.push(order);
    }
  }
  return groups;
}

function isBetter(left: OpenOrder, right: OpenOrder): boolean {
  return left.isBuy ? left.price > right.price : left.price < right.price;
}

/** A buy order only protects a worse one from sellers it also accepts. */
function reachesSameTraders(survivor: OpenOrder, order: OpenOrder): boolean {
  return !order.isBuy || (
    rangeRank(survivor.range) >= rangeRank(order.range)
    && survivor.minVolume <= order.minVolume
  );
}

function rangeRank(range: string): number {
  switch (range) {
    case 'station':
      return -1;
    case 'solarsystem':
      return 0;
    case 'region':
      return Number.POSITIVE_INFINITY;
    default:
      return Number(range);
  }
}

function bestPrice(orders: readonly OpenOrder[], isBuy: boolean): number | null {
  return orders.reduce<number | null>((best, order) => {
    if (best === null) {
      return order.price;
    }
    return isBuy ? Math.max(best, order.price) : Math.min(best, order.price);
  }, null);
}

function closestRelist(order: OpenOrder, appeared: readonly OpenOrder[]): OpenOrder | null {
  const difference = (other: OpenOrder): number =>
    Math.abs(other.volumeTotal - order.volumeRemain);
  return appeared
    .filter((other) => difference(other) <= order.volumeRemain * RELIST_VOLUME_TOLERANCE)
    .reduce<OpenOrder | null>(
      (best, other) => (best === null || difference(other) < difference(best) ? other : best),
      null,
    );
}

function nearestPrice(target: number, prices: readonly number[]): number | null {
  return prices.reduce<number | null>(
    (best, price) => (
      best === null || Math.abs(price - target) < Math.abs(best - target) ? price : best
    ),
    null,
  );
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
