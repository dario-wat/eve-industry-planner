import { Service } from 'typedi';
import { Op } from 'sequelize';
import { chunk } from 'underscore';
import { addIsoDays, closedUtcDay, toIsoDay } from '@internal/shared';
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

    const endDate = closedUtcDay();
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
    date: toIsoDay(record.date),
    average,
    highest,
    lowest,
    volume,
    orderCount,
  };
}

function numberOrNull(value: number | string | null): number | null {
  if (value === null) {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}
