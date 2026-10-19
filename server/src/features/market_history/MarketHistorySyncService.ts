import { Service } from 'typedi';
import { THE_FORGE } from '../../const/IDs';
import MarketHistoryIngestService, {
  MarketHistoryIngestProgress,
  MarketHistoryIngestResult,
} from './MarketHistoryIngestService';
import MarketHistorySummaryService from './MarketHistorySummaryService';

export type MarketHistorySyncResult = {
  ingest: MarketHistoryIngestResult;
  summaryRowsWritten: number;
};

/**
 * Fetches regional history, then rewrites summaries for those same types.
 * The script and the Lambdas differ only in which type ids they pass.
 * Null means every tradeable type.
 */
@Service()
export default class MarketHistorySyncService {
  constructor(
    private readonly ingestService: MarketHistoryIngestService,
    private readonly summaryService: MarketHistorySummaryService,
  ) {}

  public resolveTypeIds(typeIds: number[] | null): number[] {
    return this.ingestService.resolveTypeIds(typeIds);
  }

  public async genSync(
    typeIds: number[] | null,
    regionId: number = THE_FORGE,
    onIngestProgress?: (progress: MarketHistoryIngestProgress) => void,
    onSummaryProgress?: (completedTypes: number, totalTypes: number) => void,
  ): Promise<MarketHistorySyncResult> {
    const resolvedTypeIds = this.resolveTypeIds(typeIds);
    const ingest = await this.ingestService.genIngest(
      resolvedTypeIds,
      regionId,
      onIngestProgress,
    );
    const summary = await this.summaryService.genRefresh(
      resolvedTypeIds,
      regionId,
      onSummaryProgress,
    );
    return {
      ingest,
      summaryRowsWritten: summary.rowsWritten,
    };
  }
}
