import { Service } from 'typedi';
import { chunk } from 'underscore';
import { THE_FORGE } from '../../const/IDs';
import EveSdeData from '../../core/sde/EveSdeData';
import EsiQueryService from '../../core/esi/EsiQueryService';
import { EveMarketHistory } from '../../types/EsiQuery';
import { MarketHistoryDaily } from './MarketHistoryDaily';

const CHUNK_SIZE = 50;

export type MarketHistoryIngestProgress = {
  completedRequests: number;
  totalRequests: number;
  typesSucceeded: number;
  typesFailed: number;
  rowsUpserted: number;
  bytesFetched: number;
  elapsedMs: number;
};

type MarketHistoryIngestResult = {
  regionId: number;
  typeCount: number;
  typesSucceeded: number;
  typesFailed: number;
  rowsUpserted: number;
  failedTypeIds: number[];
  errors: { typeId: number; message: string }[];
};

@Service()
export default class MarketHistoryIngestService {
  constructor(
    private readonly sdeData: EveSdeData,
    private readonly esiQuery: EsiQueryService,
  ) {}

  public resolveTypeIds(typeIds: number[] | null): number[] {
    return typeIds === null
      ? this.sdeData.tradeableTypeIds()
      : [...new Set(typeIds)].sort((a, b) => a - b);
  }

  public async genIngest(
    typeIds: number[] | null = null,
    regionId: number = THE_FORGE,
    onProgress?: (progress: MarketHistoryIngestProgress) => void,
  ): Promise<MarketHistoryIngestResult> {
    const resolvedTypeIds = this.resolveTypeIds(typeIds);

    const result: MarketHistoryIngestResult = {
      regionId,
      typeCount: resolvedTypeIds.length,
      typesSucceeded: 0,
      typesFailed: 0,
      rowsUpserted: 0,
      failedTypeIds: [],
      errors: [],
    };

    if (resolvedTypeIds.length === 0) {
      return result;
    }

    const startedAt = Date.now();
    let completedRequests = 0;
    let bytesFetched = 0;

    const reportProgress = (): void => {
      onProgress?.({
        completedRequests,
        totalRequests: resolvedTypeIds.length,
        typesSucceeded: result.typesSucceeded,
        typesFailed: result.typesFailed,
        rowsUpserted: result.rowsUpserted,
        bytesFetched,
        elapsedMs: Date.now() - startedAt,
      });
    };

    reportProgress();

    for (const typeIdChunk of chunk(resolvedTypeIds, CHUNK_SIZE)) {
      const chunkOutcomes = await Promise.all(typeIdChunk.map(async (typeId) => {
        try {
          const history = await this.esiQuery.genxRegionMarketHistory(
            regionId,
            typeId,
          );
          const payloadBytes = Buffer.byteLength(JSON.stringify(history), 'utf8');
          const rowsUpserted = await this.genUpsertHistoryRows(
            regionId,
            typeId,
            history,
          );
          return {
            ok: true as const,
            rowsUpserted,
            payloadBytes,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            ok: false as const,
            typeId,
            message,
          };
        }
      }));

      for (const outcome of chunkOutcomes) {
        completedRequests += 1;
        if (outcome.ok) {
          result.typesSucceeded += 1;
          result.rowsUpserted += outcome.rowsUpserted;
          bytesFetched += outcome.payloadBytes;
        } else {
          result.typesFailed += 1;
          result.failedTypeIds.push(outcome.typeId);
          result.errors.push({ typeId: outcome.typeId, message: outcome.message });
        }
      }

      reportProgress();
    }

    result.failedTypeIds.sort((a, b) => a - b);
    return result;
  }

  private async genUpsertHistoryRows(
    regionId: number,
    typeId: number,
    history: EveMarketHistory[],
  ): Promise<number> {
    if (history.length === 0) {
      return 0;
    }

    await MarketHistoryDaily.bulkCreate(
      history.map((row) => ({
        region_id: regionId,
        type_id: typeId,
        date: row.date,
        average: row.average,
        highest: row.highest,
        lowest: row.lowest,
        order_count: row.order_count,
        volume: row.volume,
      })),
      {
        updateOnDuplicate: [
          'average',
          'highest',
          'lowest',
          'order_count',
          'volume',
        ],
      },
    );

    return history.length;
  }
}
