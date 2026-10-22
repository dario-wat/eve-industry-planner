import { Service } from 'typedi';
import { Op } from 'sequelize';
import { range } from 'lodash';
import { chunk } from 'underscore';
import { EveMarketOrder } from 'types/EsiQuery';
import EsiQueryService, { EsiMultiPageResult } from '../../core/esi/EsiQueryService';
import EsiTokenlessQueryService from '../../core/query/EsiTokenlessQueryService';
import {
  OpenOrder,
  OrderBookEntry,
  OrderBookEvent,
  OrderBookEventKind,
  diffOrderBook,
  openOrderChanges,
} from './diffOrderBook';
import { MarketOrderEvent } from './MarketOrderEvent';
import { MarketOrderOpen } from './MarketOrderOpen';

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

/** Rows per insert, so one statement does not carry the whole book. */
const WRITE_CHUNK = 1000;

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

export type StructureOrderBookFetch = {
  locationId: number;
  fetchedOrders: number;
  error: string | null;
};

export type RegionOrderBookSyncResult = {
  regionId: number;
  fetchedOrders: number;
  structureFetches: StructureOrderBookFetch[];
  eventsWritten: number;
  openOrdersInserted: number;
  openOrdersUpdated: number;
  openOrdersDeleted: number;
  eventCounts: Record<OrderBookEventKind, number>;
  observedAt: string;
};

@Service()
export default class MarketOrderBookService {
  constructor(
    private readonly esiQueryService: EsiQueryService,
    private readonly esiTokenlessQueryService: EsiTokenlessQueryService,
  ) {}

  /**
   * Every public order in the region.
   * Pages run a few at a time. A failed page aborts the pull.
   */
  public async genxRegionOrderBook(
    regionId: number,
    onProgress?: (progress: RegionOrderBookProgress) => void,
  ): Promise<EveMarketOrder[]> {
    return await this.genxPagedOrderBook(
      `Region ${regionId} order book`,
      (page) => this.esiQueryService.genxRegionMarketOrders(regionId, null, 'all', page),
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
  ): Promise<EveMarketOrder[]> {
    return await this.genxPagedOrderBook(
      `Structure ${structureId} order book`,
      (page) => this.esiTokenlessQueryService.genxStructureMarketOrders(
        TRADING_LADY,
        structureId,
        page,
      ),
      onProgress,
    );
  }

  /**
   * Fetch the region book, then both Perimeter structure books, then diff
   * the regional orders and write them. Structure orders are not stored.
   * Orders at the two structures are left unchanged. A failed region fetch
   * writes nothing. A failed structure fetch does not cancel the region write.
   */
  public async genxSyncRegionOrderBook(
    regionId: number,
    onProgress?: (progress: RegionOrderBookProgress) => void,
  ): Promise<RegionOrderBookSyncResult> {
    const fetched = await this.genxRegionOrderBook(regionId, onProgress);
    const structureFetches: StructureOrderBookFetch[] = [];
    for (const locationId of STRUCTURE_LOCATION_IDS) {
      try {
        const orders = await this.genxStructureOrderBook(locationId, onProgress);
        structureFetches.push({
          locationId,
          fetchedOrders: orders.length,
          error: null,
        });
      } catch (error) {
        structureFetches.push({
          locationId,
          fetchedOrders: 0,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    const observedAt = new Date();
    const stored = (await this.genOpenOrders(regionId))
      .filter((order) => !STRUCTURE_LOCATION_IDS.has(order.locationId));
    const listed = fetched
      .filter((order) => !STRUCTURE_LOCATION_IDS.has(order.location_id))
      .map(bookEntryFromEsi);
    const diff = diffOrderBook(stored, listed, observedAt);
    const changes = openOrderChanges(stored, diff.openOrders);
    await this.genApplyDiff(regionId, observedAt, diff.events, changes);
    return {
      regionId,
      fetchedOrders: fetched.length,
      structureFetches,
      eventsWritten: diff.events.length,
      openOrdersInserted: changes.inserted.length,
      openOrdersUpdated: changes.updated.length,
      openOrdersDeleted: changes.deletedIds.length,
      eventCounts: countEvents(diff.events),
      observedAt: observedAt.toISOString(),
    };
  }

  private async genxPagedOrderBook(
    description: string,
    fetchPage: (page: number) => Promise<EsiMultiPageResult<EveMarketOrder>>,
    onProgress?: (progress: RegionOrderBookProgress) => void,
  ): Promise<EveMarketOrder[]> {
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

    const byPage: EveMarketOrder[][] = new Array(totalPages);
    byPage[0] = first.data;
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
      return first.data;
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
          byPage[page - 1] = result.data;
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

  private async genOpenOrders(regionId: number): Promise<OpenOrder[]> {
    const rows = await MarketOrderOpen.findAll({
      where: { region_id: regionId },
      raw: true,
    }) as unknown as OpenOrderRow[];
    return rows.map(openOrderFromRow);
  }

  private async genApplyDiff(
    regionId: number,
    observedAt: Date,
    events: readonly OrderBookEvent[],
    changes: ReturnType<typeof openOrderChanges>,
  ): Promise<void> {
    const sequelize = MarketOrderOpen.sequelize;
    if (sequelize === undefined) {
      throw new Error('Market order models are not initialized');
    }

    const eventRows = events.map((item) => ({
      region_id: regionId,
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
    }));
    const openRows = [...changes.inserted, ...changes.updated].map((order) => ({
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
      issued: order.issued,
      duration: order.duration,
      missing: order.missing,
      observed_at: observedAt,
    }));

    await sequelize.transaction(async (transaction) => {
      for (const rows of chunk(eventRows, WRITE_CHUNK)) {
        await MarketOrderEvent.bulkCreate(rows, { transaction });
      }
      for (const rows of chunk(openRows, WRITE_CHUNK)) {
        await MarketOrderOpen.bulkCreate(rows, {
          updateOnDuplicate: OPEN_ORDER_UPDATE_FIELDS,
          transaction,
        });
      }
      for (const orderIds of chunk(changes.deletedIds, WRITE_CHUNK)) {
        await MarketOrderOpen.destroy({
          where: {
            region_id: regionId,
            order_id: { [Op.in]: orderIds },
          },
          transaction,
        });
      }
    });
  }
}

const OPEN_ORDER_UPDATE_FIELDS = [
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
];

function pageErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const status = (error as { statusCode?: number }).statusCode;
    const message = error instanceof Error ? error.message : '';
    return `${status ?? ''} ${message}`.trim();
  }
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
};

function bookEntryFromEsi(order: EveMarketOrder): OrderBookEntry {
  if (
    order.system_id === undefined
    || order.min_volume === undefined
    || order.is_buy_order === undefined
  ) {
    throw new Error(`Order ${order.order_id} is missing book fields`);
  }
  return {
    orderId: order.order_id,
    typeId: order.type_id,
    locationId: order.location_id,
    systemId: order.system_id,
    isBuy: order.is_buy_order,
    price: order.price,
    volumeRemain: order.volume_remain,
    volumeTotal: order.volume_total,
    minVolume: order.min_volume,
    range: order.range,
    issued: order.issued,
    duration: order.duration,
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
    range: row.range,
    issued: issuedToIso(row.issued),
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

function issuedToIso(value: Date | string): string {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Bad issued time: ${String(value)}`);
  }
  return parsed.toISOString();
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
