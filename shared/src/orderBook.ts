import type { TradeBookOrderRes } from './api';

/** Where you trade: the station, and its system for buy order range. */
export type TradeStation = {
  locationId: number;
  systemId: number;
};

/** Jumps between two systems, or null when unknown. */
export type JumpCount = (fromSystemId: number, toSystemId: number) => number | null;

export type BookSide = 'buy' | 'sell';

export type FillEstimate = {
  /** Can be less than asked for when the book runs out. */
  quantity: number;
  /** Null when nothing fills. */
  averagePrice: number | null;
  worstPrice: number | null;
  topPrice: number | null;
  /** How much worse the average is than the top price, as a fraction of the top price. */
  slippage: number | null;
};

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
 * Orders a new order at `station` would queue behind, best first. Buy side: every buy order
 * a seller there can fill. Sell side: sell orders at the station itself.
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

/** Selling `quantity` right now at `station`, into the buy orders that accept the sale. */
export function instantSell(
  orders: readonly TradeBookOrderRes[],
  station: TradeStation,
  quantity: number,
  jumps: JumpCount = tradeHubJumps,
): FillEstimate {
  return walk(competingOrders(orders, station, 'buy', jumps), quantity, true);
}

/** Buying `quantity` right now from the sell orders at `station`. */
export function instantBuy(
  orders: readonly TradeBookOrderRes[],
  station: TradeStation,
  quantity: number,
): FillEstimate {
  return walk(competingOrders(orders, station, 'sell'), quantity, false);
}

/**
 * Price of the first order at which at least `units` are on offer counting from the best,
 * so a few tiny orders at the top do not set the price. Null when the side has fewer units.
 */
export function priceAtDepth(
  competing: readonly TradeBookOrderRes[],
  units: number,
): number | null {
  let total = 0;
  for (const order of competing) {
    total += order.volumeRemain;
    if (total >= units) {
      return order.price;
    }
  }
  return null;
}

/**
 * Units a new order at `price` would wait behind: orders at a better price, and orders at the
 * same price, which were placed earlier.
 */
export function unitsAhead(
  competing: readonly TradeBookOrderRes[],
  side: BookSide,
  price: number,
): number {
  return competing
    .filter((order) => (side === 'buy' ? order.price >= price : order.price <= price))
    .reduce((total, order) => total + order.volumeRemain, 0);
}

/** A buy order with a minimum volume only takes sales of at least that many units. */
function walk(
  competing: readonly TradeBookOrderRes[],
  quantity: number,
  respectMinVolume: boolean,
): FillEstimate {
  let filled = 0;
  let cost = 0;
  let worstPrice: number | null = null;
  let topPrice: number | null = null;
  for (const order of competing) {
    if (filled >= quantity) {
      break;
    }
    const take = Math.min(quantity - filled, order.volumeRemain);
    if (respectMinVolume && take < order.minVolume) {
      continue;
    }
    topPrice ??= order.price;
    filled += take;
    cost += take * order.price;
    worstPrice = order.price;
  }
  const averagePrice = filled === 0 ? null : cost / filled;
  return {
    quantity: filled,
    averagePrice,
    worstPrice,
    topPrice,
    slippage: averagePrice === null || topPrice === null
      ? null
      : Math.abs(averagePrice - topPrice) / topPrice,
  };
}
