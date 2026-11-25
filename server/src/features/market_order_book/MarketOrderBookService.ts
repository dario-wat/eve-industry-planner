import { Service } from 'typedi';
import { range } from 'lodash';
import { Op } from 'sequelize';
import { chunk } from 'underscore';
import type { EsiMarketOrder, EsiPage } from 'eve-esi';
import EsiQueryService from '../../core/esi/EsiQueryService';
import { JITA, THE_FORGE } from '../../const/IDs';
import {
  OpenOrder,
  OrderBookEvent,
  OrderBookEventKind,
  diffOrderBook,
} from './diffOrderBook';
import { CloseEvidence, closeEvidence } from './closeEvidence';
import { MarketOrderClose, MarketOrderCloseStatus } from './MarketOrderClose';
import { MarketOrderEvent } from './MarketOrderEvent';
import { MarketOrderOpen } from './MarketOrderOpen';
import { MarketTradeDaily } from './MarketTradeDaily';

/** How many region-book pages to request at once. */
const REGION_ORDER_PAGE_CONCURRENCY = 8;

/**
 * Player structures whose orders are not owned by the regional diff.
 * Their buy orders stay as stored until a structure fetch updates them.
 * Perimeter — 0.0% Neutral States Market HQ, and Tranquility Trading Tower.
 */
const STRUCTURE_LOCATION_IDS = new Set<number>([
  1044752365771,
  1042508032148,
]);

/** Can dock at both Perimeter structures. Her token is refreshed on use. */
const TRADING_LADY = 1688205171;

/**
 * Structure orders omit system_id. Both structures are in Perimeter.
 */
const PERIMETER = 30000144;

/** Rows per insert, so one statement does not carry the whole book. */
const WRITE_CHUNK = 1000;
const READ_CHUNK = 50_000;

const SNAPSHOT_ATTEMPTS = 3;

const EVENT_RETENTION_DAYS = 30;
const CLOSE_RETENTION_DAYS = 365;
/** Per run and table. A run adds far fewer, so this keeps up. */
const PRUNE_ROWS = 10_000;
const DAY_MS = 24 * 60 * 60 * 1000;

// VALUES() rather than a row alias so the TiDB fallback accepts it too.
// LEAST/GREATEST return NULL if either side is NULL, hence the COALESCE pairs.
const DAILY_UPSERT_SQL = (rowCount: number): string =>
  `INSERT INTO ${MarketTradeDaily.tableName} (day, type_id, is_buy, ` +
  'traded_volume, traded_isk, min_price, max_price, fill_count, ' +
  'closed_volume, closed_isk, closed_count) VALUES ' +
  Array.from({ length: rowCount }, () => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ') +
  ' ON DUPLICATE KEY UPDATE ' +
  'traded_volume = traded_volume + VALUES(traded_volume), ' +
  'traded_isk = traded_isk + VALUES(traded_isk), ' +
  'min_price = LEAST(COALESCE(min_price, VALUES(min_price)), ' +
  'COALESCE(VALUES(min_price), min_price)), ' +
  'max_price = GREATEST(COALESCE(max_price, VALUES(max_price)), ' +
  'COALESCE(VALUES(max_price), max_price)), ' +
  'fill_count = fill_count + VALUES(fill_count), ' +
  'closed_volume = closed_volume + VALUES(closed_volume), ' +
  'closed_isk = closed_isk + VALUES(closed_isk), ' +
  'closed_count = closed_count + VALUES(closed_count)';

const EVENT_KINDS: readonly OrderBookEventKind[] = [
  'appeared',
  'traded',
  'repriced',
  'expired',
  'ambiguous',
];

export type RegionOrderBookProgress = {
  completedPages: number;
  totalPages: number;
  orders: number;
  elapsedMs: number;
};

type OrderBookSnapshot = {
  orders: OpenOrder[];
  lastModified: string | null;
  mixedAttempts: number;
};

type StoredBook = {
  orders: OpenOrder[];
  /** Newest observed_at per book, keyed by bookIdOf. */
  changedAt: Map<number, Date>;
};

type CloseRecord = { evidence: CloseEvidence; bookChangedAt: Date | null };

type OrderBookChanges = {
  events: OrderBookEvent[];
  inserted: OpenOrder[];
  updated: OpenOrder[];
  deletedIds: number[];
  closes: CloseRecord[];
  reappearedIds: number[];
};

export type StructureOrderBookFetch = {
  locationId: number;
  fetchedOrders: number;
  error: string | null;
  openOrdersInserted: number;
  openOrdersUpdated: number;
  openOrdersDeleted: number;
  eventCounts: Record<OrderBookEventKind, number>;
};

export type RegionOrderBookSyncResult = {
  regionId: number;
  fetchedOrders: number;
  keptOrders: number;
  structureFetches: StructureOrderBookFetch[];
  /** Last-Modified of the region book. */
  snapshotAt: string | null;
  /** Books fetched again because their pages came from different snapshots. */
  mixedSnapshots: number;
  dailyRowsWritten: number;
  eventsWritten: number;
  closesOpened: number;
  closesReappeared: number;
  eventsPruned: number;
  closesPruned: number;
  openOrdersInserted: number;
  openOrdersUpdated: number;
  openOrdersDeleted: number;
  eventCounts: Record<OrderBookEventKind, number>;
  observedAt: string;
};

@Service()
export default class MarketOrderBookService {
  constructor(private readonly esiQueryService: EsiQueryService) {}

  /**
   * Every public order in the region.
   * Pages run a few at a time. A failed page aborts the pull.
   */
  public async genxRegionOrderBook(
    regionId: number,
    onProgress?: (progress: RegionOrderBookProgress) => void,
  ): Promise<OrderBookSnapshot> {
    return await this.genxConsistentOrderBook(
      `Region ${regionId} order book`,
      (page) => this.esiQueryService.genxRegionMarketOrders(regionId, { page }),
      // Not a bare map: the index would be passed as systemId.
      (order) => bookEntryFromEsi(order),
      onProgress,
    );
  }

  /**
   * Every order in one structure, as Trading Lady.
   * Pages run a few at a time. A failed page aborts this structure.
   */
  public async genxStructureOrderBook(
    structureId: number,
    onProgress?: (progress: RegionOrderBookProgress) => void,
  ): Promise<OrderBookSnapshot> {
    return await this.genxConsistentOrderBook(
      `Structure ${structureId} order book`,
      (page) => this.esiQueryService.genxStructureMarketOrders(
        TRADING_LADY,
        structureId,
        page,
      ),
      (order) => bookEntryFromEsi(order, order.system_id ?? PERIMETER),
      onProgress,
    );
  }

  /**
   * Fetch The Forge book and both Perimeter structure books, keep Jita and the
   * structures, then write the events, closes, daily trade rollup, and
   * open-order changes.
   * A structure that failed to fetch keeps its previous orders. A failed region
   * fetch writes nothing.
   */
  public async genxSyncRegionOrderBook(
    onProgress?: (progress: RegionOrderBookProgress) => void,
  ): Promise<RegionOrderBookSyncResult> {
    const regionId = THE_FORGE;
    const region = await this.genxRegionOrderBook(regionId, onProgress);
    const fetched = region.orders;
    let mixedSnapshots = region.mixedAttempts;
    const structureBooks: { locationId: number; orders: OpenOrder[] }[] = [];
    const structureFetches: StructureOrderBookFetch[] = [];
    for (const locationId of STRUCTURE_LOCATION_IDS) {
      try {
        const book = await this.genxStructureOrderBook(locationId, onProgress);
        structureBooks.push({ locationId, orders: book.orders });
        mixedSnapshots += book.mixedAttempts;
      } catch (error) {
        structureFetches.push(structureFetch(
          locationId,
          0,
          error instanceof Error ? error.message : String(error),
        ));
      }
    }

    // MySQL DATETIME has no fraction and rounds, so drop it before comparing dates.
    const observedAt = new Date();
    observedAt.setMilliseconds(0);
    const { orders: stored, changedAt } = await this.genOpenOrders(regionId);
    const storedRegion = stored
      .filter((order) => !STRUCTURE_LOCATION_IDS.has(order.locationId));
    const listed = fetched.filter(isJitaStationOrder);
    const storedJita = storedRegion.filter(isJitaStationOrder);
    const regionDiff = diffOrderBook(storedJita, listed, observedAt);
    const { events, inserted, updated, deletedIds, reappearedIds } = regionDiff;
    const closes: CloseRecord[] = closeEvidence(storedJita, listed, regionDiff)
      .map((evidence) => ({ evidence, bookChangedAt: changedAt.get(REGION_BOOK) ?? null }));
    // Stored before the book was limited to Jita: removed without counting as closes.
    deletedIds.push(...storedRegion
      .filter((order) => !isJitaStationOrder(order))
      .map((order) => order.orderId));

    for (const book of structureBooks) {
      const storedHere = stored.filter((order) => order.locationId === book.locationId);
      const diff = diffOrderBook(storedHere, book.orders, observedAt);
      events.push(...diff.events);
      inserted.push(...diff.inserted);
      updated.push(...diff.updated);
      deletedIds.push(...diff.deletedIds);
      reappearedIds.push(...diff.reappearedIds);
      closes.push(...closeEvidence(storedHere, book.orders, diff).map((evidence) => ({
        evidence,
        bookChangedAt: changedAt.get(book.locationId) ?? null,
      })));
      structureFetches.push({
        locationId: book.locationId,
        fetchedOrders: book.orders.length,
        error: null,
        openOrdersInserted: diff.inserted.length,
        openOrdersUpdated: diff.updated.length,
        openOrdersDeleted: diff.deletedIds.length,
        eventCounts: countEvents(diff.events),
      });
    }

    const dailyRows = dailyTradeRows(events);
    await this.genApplyChanges(
      regionId,
      observedAt,
      dailyRows,
      { events, inserted, updated, deletedIds, closes, reappearedIds },
    );
    const pruned = await this.genPruneOldRows(observedAt);
    return {
      regionId,
      fetchedOrders: fetched.length,
      keptOrders: listed.length,
      structureFetches,
      snapshotAt: region.lastModified,
      mixedSnapshots,
      dailyRowsWritten: dailyRows.length,
      eventsWritten: events.length,
      closesOpened: closes.length,
      closesReappeared: reappearedIds.length,
      ...pruned,
      openOrdersInserted: inserted.length,
      openOrdersUpdated: updated.length,
      openOrdersDeleted: deletedIds.length,
      eventCounts: countEvents(events),
      observedAt: observedAt.toISOString(),
    };
  }

  /**
   * ESI can rebuild the book while its pages are being read, which makes orders
   * that moved between pages look absent. Such a pull is thrown away and repeated.
   */
  private async genxConsistentOrderBook(
    description: string,
    fetchPage: (page: number) => Promise<EsiPage<EsiMarketOrder>>,
    toEntry: (order: EsiMarketOrder) => OpenOrder,
    onProgress?: (progress: RegionOrderBookProgress) => void,
  ): Promise<OrderBookSnapshot> {
    for (let attempt = 0; attempt < SNAPSHOT_ATTEMPTS; attempt += 1) {
      const seen = new Set<string | null>();
      const orders = await this.genxPagedOrderBook(
        description,
        async (page) => {
          const result = await fetchPage(page);
          seen.add(result.lastModified);
          return result;
        },
        toEntry,
        onProgress,
      );
      if (seen.size === 1) {
        return { orders, lastModified: [...seen][0], mixedAttempts: attempt };
      }
    }
    throw new Error(
      `${description} mixed snapshots in all ${SNAPSHOT_ATTEMPTS} attempts`,
    );
  }

  private async genxPagedOrderBook(
    description: string,
    fetchPage: (page: number) => Promise<EsiPage<EsiMarketOrder>>,
    toEntry: (order: EsiMarketOrder) => OpenOrder,
    onProgress?: (progress: RegionOrderBookProgress) => void,
  ): Promise<OpenOrder[]> {
    const startedAt = Date.now();
    let first;
    try {
      first = await fetchPage(1);
    } catch (error) {
      throw new Error(
        `${description} page 1 failed: ${pageErrorMessage(error)}`,
      );
    }

    const totalPages = first.pages;
    if (!Number.isInteger(totalPages) || totalPages < 1) {
      throw new Error(`${description} page 1 returned no page count`);
    }

    const byPage: OpenOrder[][] = new Array(totalPages);
    byPage[0] = first.data.map(toEntry);
    let completedPages = 1;
    let orderCount = first.data.length;
    const report = (): void => {
      onProgress?.({
        completedPages,
        totalPages,
        orders: orderCount,
        elapsedMs: Date.now() - startedAt,
      });
    };
    report();

    if (totalPages === 1) {
      return byPage[0];
    }

    const pages = range(2, totalPages + 1);
    let nextIndex = 0;
    let failedPage: number | null = null;
    let failure: unknown = null;

    const worker = async (): Promise<void> => {
      while (failure === null) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= pages.length) {
          return;
        }
        const page = pages[index];
        try {
          const result = await fetchPage(page);
          if (failure !== null) {
            return;
          }
          byPage[page - 1] = result.data.map(toEntry);
          completedPages += 1;
          orderCount += result.data.length;
          report();
        } catch (error) {
          if (failure === null) {
            failedPage = page;
            failure = error;
          }
        }
      }
    };

    await Promise.all(
      Array.from(
        { length: Math.min(REGION_ORDER_PAGE_CONCURRENCY, pages.length) },
        () => worker(),
      ),
    );

    if (failure !== null) {
      throw new Error(
        `${description} page ${failedPage} failed: ${pageErrorMessage(failure)}`,
      );
    }

    return byPage.flat();
  }

  /** The previous open book stored in esi_market_order_open. */
  private async genOpenOrders(regionId: number): Promise<StoredBook> {
    const orders: OpenOrder[] = [];
    const changedAt = new Map<number, Date>();
    let afterOrderId = 0;
    for (;;) {
      const rows = await MarketOrderOpen.findAll({
        where: { region_id: regionId, order_id: { [Op.gt]: afterOrderId } },
        order: [['order_id', 'ASC']],
        limit: READ_CHUNK,
        raw: true,
      }) as unknown as OpenOrderRow[];
      if (rows.length === 0) {
        return { orders, changedAt };
      }
      for (const row of rows) {
        const order = openOrderFromRow(row);
        orders.push(order);
        const bookId = bookIdOf(order);
        const observedAt = new Date(row.observed_at);
        const newest = changedAt.get(bookId);
        if (newest === undefined || observedAt > newest) {
          changedAt.set(bookId, observedAt);
        }
      }
      afterOrderId = asNumber(rows[rows.length - 1].order_id);
    }
  }

  private async genPruneOldRows(
    now: Date,
  ): Promise<{ eventsPruned: number; closesPruned: number }> {
    const daysAgo = (days: number): Date => new Date(now.getTime() - days * DAY_MS);
    const eventsPruned = await MarketOrderEvent.destroy({
      where: { observed_at: { [Op.lt]: daysAgo(EVENT_RETENTION_DAYS) } },
      limit: PRUNE_ROWS,
    });
    const closesPruned = await MarketOrderClose.destroy({
      where: { first_missed_at: { [Op.lt]: daysAgo(CLOSE_RETENTION_DAYS) } },
      limit: PRUNE_ROWS,
    });
    return { eventsPruned, closesPruned };
  }

  private async genApplyChanges(
    regionId: number,
    observedAt: Date,
    dailyRows: readonly DailyTradeRow[],
    changes: OrderBookChanges,
  ): Promise<void> {
    const { events, inserted, updated, deletedIds, closes, reappearedIds } = changes;
    const sequelize = MarketOrderOpen.sequelize;
    if (sequelize === undefined) {
      throw new Error('Market order models are not initialized');
    }

    const day = observedAt.toISOString().slice(0, 10);
    const insertedRows = inserted.map((order) => openOrderRow(regionId, observedAt, order));
    const updatedRows = updated.map((order) => openOrderRow(regionId, observedAt, order));
    const eventRows = events.map((item) => eventRow(observedAt, item));
    const closeRows = closes.map((close) => closeRow(observedAt, close));
    const resolved: [MarketOrderCloseStatus, number[]][] = [
      ['reappeared', reappearedIds],
      ['expired', eventOrderIds(events, 'expired')],
      ['ambiguous', eventOrderIds(events, 'ambiguous')],
    ];

    await sequelize.transaction(async (transaction) => {
      for (const rows of chunk(eventRows, WRITE_CHUNK)) {
        await MarketOrderEvent.bulkCreate(rows, { transaction });
      }
      for (const [status, orderIds] of resolved) {
        for (const ids of chunk(orderIds, WRITE_CHUNK)) {
          await MarketOrderClose.update(
            { status, resolved_at: observedAt },
            { where: { order_id: { [Op.in]: ids }, status: 'pending' }, transaction },
          );
        }
      }
      for (const rows of chunk(closeRows, WRITE_CHUNK)) {
        await MarketOrderClose.bulkCreate(rows, { transaction });
      }
      for (const rows of chunk([...dailyRows], WRITE_CHUNK)) {
        await sequelize.query(DAILY_UPSERT_SQL(rows.length), {
          replacements: rows.flatMap((row) => [
            day,
            row.typeId,
            row.isBuy,
            row.tradedVolume,
            row.tradedIsk,
            row.minPrice,
            row.maxPrice,
            row.fillCount,
            row.closedVolume,
            row.closedIsk,
            row.closedCount,
          ]),
          transaction,
        });
      }
      for (const rows of chunk(insertedRows, WRITE_CHUNK)) {
        await MarketOrderOpen.bulkCreate(rows, { transaction });
      }
      for (const rows of chunk(updatedRows, WRITE_CHUNK)) {
        await MarketOrderOpen.bulkCreate(rows, {
          transaction,
          updateOnDuplicate: [
            'region_id',
            'type_id',
            'location_id',
            'system_id',
            'is_buy',
            'price',
            'volume_remain',
            'volume_total',
            'min_volume',
            'range',
            'issued',
            'duration',
            'missing',
            'observed_at',
          ],
        });
      }
      for (const ids of chunk([...deletedIds], WRITE_CHUNK)) {
        await MarketOrderOpen.destroy({
          where: { order_id: { [Op.in]: ids } },
          transaction,
        });
      }
    });
  }
}

function eventOrderIds(
  events: readonly OrderBookEvent[],
  kind: OrderBookEventKind,
): number[] {
  return events.filter((item) => item.kind === kind).map((item) => item.orderId);
}

function eventRow(observedAt: Date, item: OrderBookEvent) {
  return {
    observed_at: observedAt,
    kind: item.kind,
    order_id: item.orderId,
    type_id: item.typeId,
    location_id: item.locationId,
    is_buy: item.isBuy,
    price: item.price,
    previous_price: item.previousPrice,
    volume_remain: item.volumeRemain,
    previous_volume_remain: item.previousVolumeRemain,
    volume_delta: item.volumeDelta,
  };
}

function closeRow(firstMissedAt: Date, { evidence, bookChangedAt }: CloseRecord) {
  const { order, survivor, relist } = evidence;
  return {
    order_id: order.orderId,
    first_missed_at: firstMissedAt,
    status: 'pending',
    book_changed_at: bookChangedAt,
    type_id: order.typeId,
    location_id: order.locationId,
    is_buy: order.isBuy,
    price: order.price,
    volume_remain: order.volumeRemain,
    volume_total: order.volumeTotal,
    min_volume: order.minVolume,
    range: order.range,
    issued: new Date(order.issued),
    duration: order.duration,
    better_orders_before: evidence.betterOrdersBefore,
    better_volume_before: evidence.betterVolumeBefore,
    best_price_after: evidence.bestPriceAfter,
    best_opposite_price_after: evidence.bestOppositePriceAfter,
    survivor_order_id: survivor?.orderId ?? null,
    survivor_price: survivor?.price ?? null,
    relist_order_id: relist?.orderId ?? null,
    relist_price: relist?.price ?? null,
    relist_volume: relist?.volumeTotal ?? null,
    poll_traded_volume: evidence.pollTradedVolume,
    nearest_traded_price: evidence.nearestTradedPrice,
    poll_missed_count: evidence.pollMissedCount,
  };
}

function pageErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

type OpenOrderRow = {
  order_id: number | string;
  type_id: number;
  location_id: number | string;
  system_id: number;
  is_buy: boolean | number;
  price: number;
  volume_remain: number | string;
  volume_total: number | string;
  min_volume: number | string;
  range: string;
  issued: Date | string;
  duration: number;
  missing: boolean | number | null;
  observed_at: Date | string;
};

function bookEntryFromEsi(
  order: EsiMarketOrder,
  systemId: number | undefined = order.system_id,
): OpenOrder {
  if (
    systemId === undefined
    || order.min_volume === undefined
    || order.is_buy_order === undefined
  ) {
    const missing = [
      systemId === undefined ? 'system_id' : '',
      order.min_volume === undefined ? 'min_volume' : '',
      order.is_buy_order === undefined ? 'is_buy_order' : '',
    ].filter((field) => field !== '').join(', ');
    throw new Error(`Order ${order.order_id} is missing ${missing}`);
  }
  return {
    orderId: order.order_id,
    typeId: order.type_id,
    locationId: order.location_id,
    systemId,
    isBuy: order.is_buy_order,
    price: order.price,
    volumeRemain: order.volume_remain,
    volumeTotal: order.volume_total,
    minVolume: order.min_volume,
    range: internRange(order.range),
    issued: issuedMs(order.issued),
    duration: order.duration,
    missing: false,
  };
}

function openOrderRow(regionId: number, observedAt: Date, order: OpenOrder) {
  return {
    order_id: order.orderId,
    region_id: regionId,
    type_id: order.typeId,
    location_id: order.locationId,
    system_id: order.systemId,
    is_buy: order.isBuy,
    price: order.price,
    volume_remain: order.volumeRemain,
    volume_total: order.volumeTotal,
    min_volume: order.minVolume,
    range: order.range,
    issued: new Date(order.issued),
    duration: order.duration,
    missing: order.missing,
    observed_at: observedAt,
  };
}

function openOrderFromRow(row: OpenOrderRow): OpenOrder {
  return {
    orderId: asNumber(row.order_id),
    typeId: row.type_id,
    locationId: asNumber(row.location_id),
    systemId: row.system_id,
    isBuy: Boolean(row.is_buy),
    price: row.price,
    volumeRemain: asNumber(row.volume_remain),
    volumeTotal: asNumber(row.volume_total),
    minVolume: asNumber(row.min_volume),
    range: internRange(row.range),
    issued: issuedMs(row.issued),
    duration: row.duration,
    missing: Boolean(row.missing),
  };
}

function asNumber(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Expected a number, received ${String(value)}`);
  }
  return parsed;
}

function issuedMs(value: Date | string): number {
  const parsed = value instanceof Date ? value.getTime() : Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Bad issued time: ${String(value)}`);
  }
  return parsed;
}

const RANGES = new Map<string, string>();

/** Every parsed order gets its own copy of a range string; a book has only a few values. */
function internRange(range: string): string {
  const known = RANGES.get(range);
  if (known !== undefined) {
    return known;
  }
  RANGES.set(range, range);
  return range;
}

function structureFetch(
  locationId: number,
  fetchedOrders: number,
  error: string | null,
): StructureOrderBookFetch {
  return {
    locationId,
    fetchedOrders,
    error,
    openOrdersInserted: 0,
    openOrdersUpdated: 0,
    openOrdersDeleted: 0,
    eventCounts: countEvents([]),
  };
}

function countEvents(
  events: readonly { kind: OrderBookEventKind }[],
): Record<OrderBookEventKind, number> {
  const counts = Object.fromEntries(EVENT_KINDS.map((kind) => [kind, 0])) as Record<
    OrderBookEventKind,
    number
  >;
  for (const item of events) {
    counts[item.kind] += 1;
  }
  return counts;
}

const REGION_BOOK = 0;

/** Each structure is fetched as its own book. Everything else is the region book. */
function bookIdOf(order: OpenOrder): number {
  return STRUCTURE_LOCATION_IDS.has(order.locationId) ? order.locationId : REGION_BOOK;
}

function isJitaStationOrder(order: OpenOrder): boolean {
  return order.systemId === JITA && !STRUCTURE_LOCATION_IDS.has(order.locationId);
}

type DailyTradeRow = {
  typeId: number;
  isBuy: boolean;
  tradedVolume: number;
  tradedIsk: number;
  minPrice: number | null;
  maxPrice: number | null;
  fillCount: number;
  closedVolume: number;
  closedIsk: number;
  closedCount: number;
};

/** Leftover volume on expired orders is not counted anywhere. */
function dailyTradeRows(events: readonly OrderBookEvent[]): DailyTradeRow[] {
  const byKey = new Map<string, DailyTradeRow>();
  for (const item of events) {
    if (item.kind !== 'traded' && item.kind !== 'ambiguous') {
      continue;
    }
    const key = `${item.typeId}:${item.isBuy ? 1 : 0}`;
    let row = byKey.get(key);
    if (row === undefined) {
      row = {
        typeId: item.typeId,
        isBuy: item.isBuy,
        tradedVolume: 0,
        tradedIsk: 0,
        minPrice: null,
        maxPrice: null,
        fillCount: 0,
        closedVolume: 0,
        closedIsk: 0,
        closedCount: 0,
      };
      byKey.set(key, row);
    }
    if (item.kind === 'traded') {
      const volume = item.volumeDelta ?? 0;
      row.tradedVolume += volume;
      row.tradedIsk += volume * item.price;
      row.minPrice = row.minPrice === null ? item.price : Math.min(row.minPrice, item.price);
      row.maxPrice = row.maxPrice === null ? item.price : Math.max(row.maxPrice, item.price);
      row.fillCount += 1;
    } else {
      row.closedVolume += item.volumeRemain;
      row.closedIsk += item.volumeRemain * item.price;
      row.closedCount += 1;
    }
  }
  return [...byKey.values()];
}
