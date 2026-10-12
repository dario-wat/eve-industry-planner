import { Service } from 'typedi';
import { Op } from 'sequelize';
import { chunk } from 'underscore';
import {
  addIsoDays,
  closedUtcDay,
  type MarketHistoryScanItemRes,
  type MarketHistoryScanRes,
  type MarketHistoryScanWindowRes,
} from '@internal/shared';
import { THE_FORGE } from '../../const/IDs';
import EveSdeData from '../../core/sde/EveSdeData';
import { MarketHistoryDaily } from './MarketHistoryDaily';
import { MarketHistorySummary } from './MarketHistorySummary';
import {
  SUMMARY_HISTORY_DAYS,
  SummaryHistoryRow,
  buildTypeSummaries,
} from './marketHistorySummaryMath';

// How many types to load and rewrite at once, so one query does not pull every daily row.
const TYPE_CHUNK = 100;

type MarketHistorySummaryRefreshResult = {
  rowsWritten: number;
};

type DailyRecord = {
  type_id: number;
  date: string | Date;
  average: number | null;
  highest: number | null;
  lowest: number | null;
  order_count: number | null;
  volume: number | string | null;
};

@Service()
export default class MarketHistorySummaryService {
  constructor(
    private readonly sdeData: EveSdeData,
  ) {}

  /**
   * Every stored summary window for one region, joined to type name and category.
   * Median ISK is daily volume times that day's average, then the median of those days.
   */
  public async genMarketHistoryScan(regionId: number = THE_FORGE): Promise<MarketHistoryScanRes> {
    const records = await MarketHistorySummary.findAll({
      where: { region_id: regionId },
    });

    const items = new Map<number, MarketHistoryScanItemRes>();
    let asOfDate = '';
    for (const record of records) {
      const typeId = Number(record.type_id);
      const type = this.sdeData.types[typeId];
      if (type === undefined) {
        continue;
      }
      const asOf = calendarDay(record.as_of_date);
      if (asOf > asOfDate) {
        asOfDate = asOf;
      }
      const item = items.get(typeId) ?? {
        typeId,
        name: type.name,
        categoryId: this.sdeData.categoryIdFromTypeId(typeId) ?? null,
        categoryName: this.sdeData.categoryNameFromTypeId(typeId) ?? null,
        windows: [],
      };
      item.windows.push(toScanWindow(record));
      items.set(typeId, item);
    }

    const listed = [...items.values()];
    for (const item of listed) {
      item.windows.sort((left, right) => left.windowDays - right.windowDays);
    }
    listed.sort((left, right) => left.typeId - right.typeId);
    return { regionId, asOfDate, items: listed };
  }

  /**
   * Rewrites summary rows for these types from stored daily history.
   * Types that were not fetched are left untouched.
   */
  public async genRefresh(
    typeIds: number[],
    regionId: number,
    onProgress?: (completedTypes: number, totalTypes: number) => void,
  ): Promise<MarketHistorySummaryRefreshResult> {
    const uniqueTypeIds = [...new Set(typeIds)];
    const result: MarketHistorySummaryRefreshResult = {
      rowsWritten: 0,
    };
    if (uniqueTypeIds.length === 0) {
      return result;
    }

    // ESI leaves the current UTC day open, and it does not publish the previous
    // day until downtime (~11:00 UTC). A sync before that has no row for
    // yesterday, so ending the window on closedUtcDay() counts one empty day
    // for every type. Stop on the last day that was actually stored.
    const closed = closedUtcDay();
    const latestStored = await this.genLatestStoredDay(regionId);
    const endDate = latestStored !== null && latestStored <= closed ? latestStored : closed;
    const spanStart = addIsoDays(endDate, -(SUMMARY_HISTORY_DAYS - 1));
    let completedTypes = 0;
    onProgress?.(completedTypes, uniqueTypeIds.length);

    for (const typeIdChunk of chunk(uniqueTypeIds, TYPE_CHUNK)) {
      const written = await this.genRefreshChunk(regionId, typeIdChunk, endDate, spanStart);
      result.rowsWritten += written;
      completedTypes += typeIdChunk.length;
      onProgress?.(completedTypes, uniqueTypeIds.length);
    }

    return result;
  }

  private async genRefreshChunk(
    regionId: number,
    typeIds: number[],
    endDate: string,
    spanStart: string,
  ): Promise<number> {
    const [recentRows, earlierRows] = await Promise.all([
      MarketHistoryDaily.findAll({
        where: {
          region_id: regionId,
          type_id: { [Op.in]: typeIds },
          date: { [Op.gte]: spanStart, [Op.lte]: endDate },
        },
        raw: true,
      }),
      MarketHistoryDaily.findAll({
        attributes: ['type_id'],
        where: {
          region_id: regionId,
          type_id: { [Op.in]: typeIds },
          date: { [Op.lt]: spanStart },
        },
        group: ['type_id'],
        raw: true,
      }),
    ]);

    const byType = new Map<number, SummaryHistoryRow[]>();
    for (const record of recentRows as unknown as DailyRecord[]) {
      const row = toHistoryRow(record);
      if (row === null) {
        continue;
      }
      const list = byType.get(record.type_id) ?? [];
      list.push(row);
      byType.set(record.type_id, list);
    }
    const earlierTypeIds = new Set(
      (earlierRows as unknown as { type_id: number }[]).map((row) => Number(row.type_id)),
    );

    const summaries = typeIds.flatMap((typeId) => buildTypeSummaries({
      regionId,
      typeId,
      rows: byType.get(typeId) ?? [],
      hasEarlierHistory: earlierTypeIds.has(typeId),
      endDate,
      spanStart,
    }));

    const sequelize = MarketHistorySummary.sequelize;
    if (sequelize === undefined) {
      throw new Error('Market history summary model is not initialized');
    }

    await sequelize.transaction(async (transaction) => {
      await MarketHistorySummary.destroy({
        where: {
          region_id: regionId,
          type_id: { [Op.in]: typeIds },
        },
        transaction,
      });
      if (summaries.length > 0) {
        await MarketHistorySummary.bulkCreate(
          summaries.map((summary) => ({
            region_id: summary.regionId,
            type_id: summary.typeId,
            window_days: summary.windowDays,
            median_price: summary.medianPrice,
            price_change: summary.priceChange,
            median_units: summary.medianUnits,
            median_isk: summary.medianIsk,
            median_orders: summary.medianOrders,
            days_traded: summary.daysTraded,
            median_range: summary.medianRange,
            isk_weighted_range: summary.iskWeightedRange,
            median_price_in_range: summary.medianPriceInRange,
            as_of_date: summary.asOfDate,
          })),
          { transaction },
        );
      }
    });

    return summaries.length;
  }

  private async genLatestStoredDay(regionId: number): Promise<string | null> {
    const row = await MarketHistoryDaily.findOne({
      attributes: ['date'],
      where: { region_id: regionId },
      order: [['date', 'DESC']],
      raw: true,
    }) as { date: string | Date } | null;
    if (row === null) {
      return null;
    }
    return calendarDay(row.date);
  }
}

function toHistoryRow(record: DailyRecord): SummaryHistoryRow | null {
  const average = numberOrNull(record.average);
  const highest = numberOrNull(record.highest);
  const lowest = numberOrNull(record.lowest);
  const volume = numberOrNull(record.volume);
  const orderCount = numberOrNull(record.order_count);
  if (
    average === null
    || highest === null
    || lowest === null
    || volume === null
    || orderCount === null
  ) {
    return null;
  }
  return {
    date: calendarDay(record.date),
    average,
    highest,
    lowest,
    volume,
    orderCount,
  };
}

function toScanWindow(record: MarketHistorySummary): MarketHistoryScanWindowRes {
  return {
    windowDays: record.window_days,
    medianPrice: record.median_price,
    priceChange: record.price_change,
    medianUnits: record.median_units,
    medianIsk: record.median_isk,
    medianOrders: record.median_orders,
    daysTraded: record.days_traded,
    medianRange: record.median_range,
    iskWeightedRange: record.isk_weighted_range,
    medianPriceInRange: record.median_price_in_range,
  };
}

/**
 * Calendar day for a MySQL DATEONLY value.
 * mysql2 returns DATE as local midnight, so UTC formatting would move the day
 * backward in timezones ahead of UTC.
 */
function calendarDay(value: string | Date): string {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function numberOrNull(value: number | string | null): number | null {
  if (value === null) {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}
