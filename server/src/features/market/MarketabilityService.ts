import { mean } from 'lodash';
import { THE_FORGE } from '../../const/IDs';
import ActorContext from '../../core/actor_context/ActorContext';
import EsiTokenlessQueryService from '../../core/query/EsiTokenlessQueryService';
import { Service } from 'typedi';
import { potentialTypeIds } from '../../const/potentialItems';
import { chunk } from 'underscore';

type MarketabilityScore = { name: string, value: number };
type TypeIdMarketability = {
  typeId: number,
  scores: MarketabilityScore[],
};

const RECENT_DAYS = 60;

/** Minimum difference in price between high and low. */
const MIN_DIFF = 0.1;
/** Percentage of days that satisfy minimum difference. */
const MIN_DIFF_DAYS = 0.9;

/** Range for the average price between low and high. */
const AVG_RANGE = [0.3, 0.7];
/** Percentage of days that satisfy average range. */
const AVG_RANGE_DAYS = 0.9;

const AVG_PRICE = 1000000;
const AVG_PRICE_DAYS = 0.9;

const AVG_ISK_VOLUME = 1000000000;
const AVG_ISK_VOLUME_DAYS = 0.9;

const CHUNK_SIZE = 100;

/**
 * Service used to evaluate items for their potential
 * tradeability.
 */
@Service()
export default class MarketabilityService {

  constructor(
    private readonly esiQuery: EsiTokenlessQueryService,
  ) { }

  /**
   * Evaluates a single type ID for marketability and returns
   * a list of scores.
   */
  private async genEvaluate(
    actorContext: ActorContext,
    typeId: number,
  ): Promise<MarketabilityScore[]> {
    const main = await actorContext.genxMainCharacter();
    const history = await this.esiQuery.genxRegionMarketHistory(
      main.characterId,
      THE_FORGE,
      typeId,
    );

    const recentHistory = history.sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, RECENT_DAYS);

    const avgDiff = mean(
      recentHistory.slice(0, 3).map(h => (h.highest - h.lowest) / h.highest)
    );
    const avgPrice = mean(
      recentHistory.slice(0, 14).map(h => h.average)
    );
    const avgIskVolume = mean(
      recentHistory.slice(0, 14).map(h => h.average * h.volume)
    );
    const avgAvgLineDiff = mean(
      recentHistory.slice(0, 30).map(h =>
        (h.average - h.lowest) / (h.highest - h.lowest)
      )
    );

    return [
      { name: 'avgDiff', value: avgDiff },
      { name: 'avgPrice', value: avgPrice },
      { name: 'avgIskVolume', value: avgIskVolume },
      { name: 'avgAvgLineDiff', value: avgAvgLineDiff },
    ];
  }

  /** Evaluates all potential type IDs for marketability. */
  public async genEvaluatePotentialTradeItems(
    actorContext: ActorContext
  ): Promise<TypeIdMarketability[]> {
    let result: TypeIdMarketability[] = [];
    const typeIdChunks = chunk(potentialTypeIds, CHUNK_SIZE);
    for (const typeIdChunk of typeIdChunks) {
      const typeIdEval = await Promise.all(
        typeIdChunk.map(async typeId => ({
          typeId,
          scores: await this.genEvaluate(actorContext, typeId),
        }))
      );
      result = [...result, ...typeIdEval]
    }

    return result;
  }
}