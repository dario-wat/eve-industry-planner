import type { TradeBookOrderRes } from './api';

/** Where you trade: the station, and its system for buy order range. */
export type TradeStation = {
  locationId: number;
  systemId: number;
};

/** Jumps between two systems, or null when unknown. */
export type JumpCount = (fromSystemId: number, toSystemId: number) => number | null;

export type BookSide = 'buy' | 'sell';

const JITA_SYSTEM_ID = 30000142;
const PERIMETER_SYSTEM_ID = 30000144;

/** Only the systems the stored book covers. Jita and Perimeter are neighbours. */
export function tradeHubJumps(fromSystemId: number, toSystemId: number): number | null {
  if (fromSystemId === toSystemId) {
    return 0;
  }
  const pair = [fromSystemId, toSystemId].sort().join(':');
  return pair === [JITA_SYSTEM_ID, PERIMETER_SYSTEM_ID].sort().join(':') ? 1 : null;
}

/** Whether a seller at `station` can sell into this buy order. */
export function buyOrderReaches(
  order: TradeBookOrderRes,
  station: TradeStation,
  jumps: JumpCount = tradeHubJumps,
): boolean {
  switch (order.range) {
    case 'station':
      return order.locationId === station.locationId;
    case 'solarsystem':
      return order.systemId === station.systemId;
    case 'region':
      return true;
    default: {
      const range = Number(order.range);
      const distance = jumps(order.systemId, station.systemId);
      return Number.isFinite(range) && distance !== null && distance <= range;
    }
  }
}

/**
 * Orders a new order competes with when trading happens at `station`, best first. Buy side: every
 * buy order a seller there can fill, wherever it was placed. Sell side: sell orders at the station.
 */
export function competingOrders(
  orders: readonly TradeBookOrderRes[],
  station: TradeStation,
  side: BookSide,
  jumps: JumpCount = tradeHubJumps,
): TradeBookOrderRes[] {
  return side === 'buy'
    ? orders
      .filter((order) => order.isBuy && buyOrderReaches(order, station, jumps))
      .sort((left, right) => right.price - left.price)
    : orders
      .filter((order) => !order.isBuy && order.locationId === station.locationId)
      .sort((left, right) => left.price - right.price);
}

/** Where an order stands against the competition at the trading station. */
export type OrderStanding =
  | {
    status: 'top';
    /** The best competing price behind yours, or null with no competition. */
    nextPrice: number | null;
  }
  | {
    status: 'outbid';
    bestPrice: number;
    bestLocationId: number;
    /** Competing orders a trade fills before yours. */
    ordersAhead: number;
  }
  /** A sell order elsewhere, or a buy order whose range does not reach the station. */
  | { status: 'away' };

/**
 * Compares `order` with the book at `station`, where the trading happens. Orders in `ownOrderIds`
 * are not competition. At the same price the older order fills first.
 */
export function orderStanding(
  order: TradeBookOrderRes,
  book: readonly TradeBookOrderRes[],
  station: TradeStation,
  ownOrderIds: ReadonlySet<number>,
  jumps: JumpCount = tradeHubJumps,
): OrderStanding {
  const side: BookSide = order.isBuy ? 'buy' : 'sell';
  const trades = order.isBuy
    ? buyOrderReaches(order, station, jumps)
    : order.locationId === station.locationId;
  if (!trades) {
    return { status: 'away' };
  }
  const competing = competingOrders(book, station, side, jumps)
    .filter((other) => !ownOrderIds.has(other.orderId));
  const better = (other: TradeBookOrderRes) => {
    if (other.price === order.price) {
      return other.issued < order.issued;
    }
    return order.isBuy ? other.price > order.price : other.price < order.price;
  };
  const ahead = competing.filter(better);
  if (ahead.length === 0) {
    return { status: 'top', nextPrice: competing[0]?.price ?? null };
  }
  return {
    status: 'outbid',
    bestPrice: ahead[0].price,
    bestLocationId: ahead[0].locationId,
    ordersAhead: ahead.length,
  };
}
