import { Service } from 'typedi';
import { range } from 'lodash';
import { EveMarketOrder } from 'types/EsiQuery';
import EsiQueryService from '../../core/esi/EsiQueryService';

/** How many region-book pages to request at once. */
const REGION_ORDER_PAGE_CONCURRENCY = 8;

export type RegionOrderBookProgress = {
  completedPages: number;
  totalPages: number;
  orders: number;
  elapsedMs: number;
};

@Service()
export default class MarketOrderBookService {
  constructor(
    private readonly esiQueryService: EsiQueryService,
  ) {}

  /**
   * Every public order in the region.
   * Pages run a few at a time. A failed page aborts the pull.
   */
  public async genxRegionOrderBook(
    regionId: number,
    onProgress?: (progress: RegionOrderBookProgress) => void,
  ): Promise<EveMarketOrder[]> {
    const startedAt = Date.now();
    let first;
    try {
      first = await this.esiQueryService.genxRegionMarketOrders(regionId, null, 'all', 1);
    } catch (error) {
      throw new Error(
        `Region ${regionId} order book page 1 failed: ${pageErrorMessage(error)}`,
      );
    }

    const totalPages = first.pages;
    if (!Number.isInteger(totalPages) || totalPages < 1) {
      throw new Error(`Region ${regionId} order book page 1 returned no page count`);
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
          const result = await this.esiQueryService.genxRegionMarketOrders(
            regionId,
            null,
            'all',
            page,
          );
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
        `Region ${regionId} order book page ${failedPage} failed: ${pageErrorMessage(failure)}`,
      );
    }

    return byPage.flat();
  }
}

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
