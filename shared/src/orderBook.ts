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
 * Orders a new order at `station` competes with, best first. Buy side: every buy order a seller
 * there can fill, wherever it was placed. Sell side: sell orders at the station itself.
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
