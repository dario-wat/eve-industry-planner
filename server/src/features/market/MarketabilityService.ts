import { mean } from 'lodash';
import { THE_FORGE } from '../../const/IDs';
import EsiQueryService from '../../core/esi/EsiQueryService';
import { Service } from 'typedi';
import { chunk, isNaN } from 'underscore';
import { MarketabilityRes } from '@internal/shared';
import EveSdeData from '../../core/sde/EveSdeData';

// TODO
// - scheduled job for this
// - compute avg diff from live data

type MarketabilityScore = { name: string, value: number };
type TypeIdMarketability = {
  typeId: number,
  scores: MarketabilityScore[],
};

const EPS = 1e-6;

const RECENT_DAYS = 60;

const CHUNK_SIZE = 100;

/**
 * Service used to evaluate items for their potential
 * tradeability.
 */
@Service()
export default class MarketabilityService {

  constructor(
    private readonly esiQuery: EsiQueryService,
    private readonly sdeData: EveSdeData,
  ) { }

  /**
   * Evaluates a single type ID for marketability and returns
   * a list of scores.
   */
  private async genEvaluate(typeId: number): Promise<MarketabilityScore[]> {
    const history = await this.esiQuery.genxRegionMarketHistory(
      THE_FORGE,
      typeId,
    );

    const recentHistory = history.sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, RECENT_DAYS);

    // TODO magic numbers
    const avgDiff = mean(
      recentHistory.slice(0, 3).filter(h => h.highest > EPS)
        .map(h => (h.highest - h.lowest) / h.highest)
    );
    const avgPrice = mean(
      recentHistory.slice(0, 14).map(h => h.average)
    );
    const avgIskVolume = mean(
      recentHistory.slice(0, 14).map(h => h.average * h.volume)
    );
    const avgAvgLineDiff = mean(
      recentHistory.slice(0, 30).filter(h => h.highest - h.lowest > EPS).map(h =>
        (h.average - h.lowest) / (h.highest - h.lowest)
      )
    );
    const avgVolume = mean(recentHistory.slice(0, 14).map(h => h.volume));

    return [
      { name: 'avgDiff', value: avgDiff },
      { name: 'avgPrice', value: avgPrice },
      { name: 'avgIskVolume', value: avgIskVolume },
      { name: 'avgAvgLineDiff', value: isNaN(avgAvgLineDiff) ? -1 : avgAvgLineDiff },
      { name: 'avgVolume', value: avgVolume },
    ];
  }

  /**
   * Scores the SDE trade-candidate universe. Price and volume are liquidity
   * scores here, not membership. Live ESI until the history warehouse exists.
   */
  public async genEvaluatePotentialTradeItems(): Promise<TypeIdMarketability[]> {
    let result: TypeIdMarketability[] = [];
    const typeIdChunks = chunk(this.sdeData.tradeableTypeIds(), CHUNK_SIZE);
    for (const typeIdChunk of typeIdChunks) {
      const typeIdEval = await Promise.all(
        typeIdChunk.map(async typeId => ({
          typeId,
          scores: await this.genEvaluate(typeId),
        }))
      );
      result = [...result, ...typeIdEval]
    }

    return result;
  }

  /** 
   * Similar to genEvaluatePotentialTradeItems, but it augments the data
   * for response to UI.
   */
  public async genMarketableItemsForPage(): Promise<MarketabilityRes> {
    const marketableItems = await this.genEvaluatePotentialTradeItems();
    return marketableItems.map(i => ({
      ...i,
      categoryId: this.sdeData.categoryIdFromTypeId(i.typeId),
      name: this.sdeData.types[i.typeId].name,
    }));
  }
}