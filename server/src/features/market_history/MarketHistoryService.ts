import { Service } from 'typedi';
import { MarketHistoryRes } from '@internal/shared';
import { THE_FORGE } from '../../const/IDs';
import EsiQueryService from '../../core/esi/EsiQueryService';
import EveSdeData from '../../core/sde/EveSdeData';

@Service()
export default class MarketHistoryService {
  constructor(
    private readonly sdeData: EveSdeData,
    private readonly esiQueryService: EsiQueryService,
  ) {}

  /** Fetches The Forge market history for one type. Returns the full ESI series. */
  public async genMarketHistory(typeId: number): Promise<MarketHistoryRes> {
    if (this.sdeData.types[typeId] === undefined) {
      return [];
    }
    const history = await this.esiQueryService.genxRegionMarketHistory(
      THE_FORGE,
      typeId,
    );
    return history.slice().sort((a, b) => a.date.localeCompare(b.date));
  }
}
