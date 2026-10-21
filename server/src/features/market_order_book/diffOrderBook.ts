const DAY_MS = 24 * 60 * 60 * 1000;

/** One order from a fetched book. */
export type OrderBookEntry = {
  orderId: number;
  typeId: number;
  locationId: number;
  systemId: number;
  isBuy: boolean;
  price: number;
  volumeRemain: number;
  volumeTotal: number;
  minVolume: number;
  range: string;
  issued: string;
  duration: number;
};

/** An order still open after the last successful comparison. */
export type OpenOrder = OrderBookEntry & {
  missing: boolean;
};

export type OrderBookEventKind = 'appeared' | 'traded' | 'repriced' | 'expired' | 'ambiguous';

export type OrderBookEvent = {
  kind: OrderBookEventKind;
  orderId: number;
  typeId: number;
  locationId: number;
  isBuy: boolean;
  price: number;
  previousPrice: number | null;
  volumeRemain: number;
  previousVolumeRemain: number | null;
  volumeDelta: number | null;
};

export type OrderBookDiff = {
  openOrders: OpenOrder[];
  events: OrderBookEvent[];
};

export type OpenOrderChanges = {
  inserted: OpenOrder[];
  updated: OpenOrder[];
  deletedIds: number[];
};

/** Rows to insert, update, or delete so the stored book matches `next`. */
export function openOrderChanges(
  stored: readonly OpenOrder[],
  next: readonly OpenOrder[],
): OpenOrderChanges {
  const previousById = firstById(stored);
  const nextIds = new Set<number>();
  const inserted: OpenOrder[] = [];
  const updated: OpenOrder[] = [];

  for (const order of next) {
    if (nextIds.has(order.orderId)) {
      continue;
    }
    nextIds.add(order.orderId);
    const prior = previousById.get(order.orderId);
    if (prior === undefined) {
      inserted.push(order);
      continue;
    }
    if (!sameOpenOrder(prior, order)) {
      updated.push(order);
    }
  }

  const deletedIds: number[] = [];
  for (const order of stored) {
    if (!nextIds.has(order.orderId)) {
      deletedIds.push(order.orderId);
    }
  }

  return { inserted, updated, deletedIds };
}

/**
 * Compare the previous open orders to a new book.
 * An order that is absent once stays open and is marked missing.
 * It closes only when it is still absent. Leftover volume on a close is not a trade.
 */
export function diffOrderBook(
  previous: readonly OpenOrder[],
  next: readonly OrderBookEntry[],
  observedAt: Date,
): OrderBookDiff {
  const previousById = firstById(previous);
  const nextById = firstById(next);
  const events: OrderBookEvent[] = [];
  const openOrders: OpenOrder[] = [];

  const orderIds = [...new Set([...previousById.keys(), ...nextById.keys()])];
  orderIds.sort((left, right) => left - right);

  for (const orderId of orderIds) {
    const prior = previousById.get(orderId);
    const current = nextById.get(orderId);
    if (current !== undefined && prior === undefined) {
      events.push(event('appeared', current, null, null));
      openOrders.push({ ...current, missing: false });
      continue;
    }
    if (current !== undefined && prior !== undefined) {
      if (current.price !== prior.price) {
        events.push(event('repriced', current, prior.price, null));
      }
      if (current.volumeRemain < prior.volumeRemain) {
        events.push(event(
          'traded',
          current,
          null,
          prior.volumeRemain - current.volumeRemain,
          prior.volumeRemain,
        ));
      }
      openOrders.push({ ...current, missing: false });
      continue;
    }
    if (prior === undefined) {
      continue;
    }
    if (!prior.missing) {
      openOrders.push({ ...prior, missing: true });
      continue;
    }
    const kind = isExpired(prior, observedAt) ? 'expired' : 'ambiguous';
    events.push(event(kind, prior, null, null));
  }

  return { openOrders, events };
}

function sameOpenOrder(left: OpenOrder, right: OpenOrder): boolean {
  return left.typeId === right.typeId
    && left.locationId === right.locationId
    && left.systemId === right.systemId
    && left.isBuy === right.isBuy
    && left.price === right.price
    && left.volumeRemain === right.volumeRemain
    && left.volumeTotal === right.volumeTotal
    && left.minVolume === right.minVolume
    && left.range === right.range
    && left.duration === right.duration
    && left.missing === right.missing
    && Date.parse(left.issued) === Date.parse(right.issued);
}

function firstById<T extends { orderId: number }>(orders: readonly T[]): Map<number, T> {
  const byId = new Map<number, T>();
  for (const order of orders) {
    if (!byId.has(order.orderId)) {
      byId.set(order.orderId, order);
    }
  }
  return byId;
}

function isExpired(order: OrderBookEntry, observedAt: Date): boolean {
  const issuedMs = Date.parse(order.issued);
  return issuedMs + order.duration * DAY_MS <= observedAt.getTime();
}

function event(
  kind: OrderBookEventKind,
  order: OrderBookEntry,
  previousPrice: number | null,
  volumeDelta: number | null,
  previousVolumeRemain: number | null = null,
): OrderBookEvent {
  return {
    kind,
    orderId: order.orderId,
    typeId: order.typeId,
    locationId: order.locationId,
    isBuy: order.isBuy,
    price: order.price,
    previousPrice,
    volumeRemain: order.volumeRemain,
    previousVolumeRemain,
    volumeDelta,
  };
}
