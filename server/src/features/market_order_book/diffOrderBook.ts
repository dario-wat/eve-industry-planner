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
  /** Epoch milliseconds. */
  issued: number;
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
  events: OrderBookEvent[];
  inserted: OpenOrder[];
  updated: OpenOrder[];
  deletedIds: number[];
};

/**
 * Compare the stored open orders to a new book: the events, and the rows to insert,
 * update, or delete so the stored book matches.
 * An order that is absent once stays open and is marked missing.
 * It closes only when it is still absent. Leftover volume on a close is not a trade.
 */
export function diffOrderBook(
  previous: readonly OpenOrder[],
  next: readonly OpenOrder[],
  observedAt: Date,
): OrderBookDiff {
  const previousById = firstById(previous);
  const nextById = firstById(next);
  const events: OrderBookEvent[] = [];
  const inserted: OpenOrder[] = [];
  const updated: OpenOrder[] = [];
  const deletedIds: number[] = [];

  for (const [orderId, current] of nextById) {
    const listed = current.missing ? { ...current, missing: false } : current;
    const prior = previousById.get(orderId);
    if (prior === undefined) {
      events.push(event('appeared', listed, null, null));
      inserted.push(listed);
      continue;
    }
    if (listed.price !== prior.price) {
      events.push(event('repriced', listed, prior.price, null));
    }
    if (listed.volumeRemain < prior.volumeRemain) {
      events.push(event(
        'traded',
        listed,
        null,
        prior.volumeRemain - listed.volumeRemain,
        prior.volumeRemain,
      ));
    }
    if (!sameOpenOrder(prior, listed)) {
      updated.push(listed);
    }
  }

  for (const [orderId, prior] of previousById) {
    if (nextById.has(orderId)) {
      continue;
    }
    if (!prior.missing) {
      updated.push({ ...prior, missing: true });
      continue;
    }
    const kind = isExpired(prior, observedAt) ? 'expired' : 'ambiguous';
    events.push(event(kind, prior, null, null));
    deletedIds.push(orderId);
  }

  events.sort((left, right) => left.orderId - right.orderId);
  return { events, inserted, updated, deletedIds };
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
    && left.issued === right.issued;
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
  return order.issued + order.duration * DAY_MS <= observedAt.getTime();
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
