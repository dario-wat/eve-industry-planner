import { Service } from 'typedi';
import { TradeBookRes, TradeFeeRatesRes } from '@internal/shared';
import ActorContext from '../../core/actor_context/ActorContext';
import CharacterContextService from '../character_context/CharacterContextService';
import TradeSettingsService from '../trade_settings/TradeSettingsService';
import FeeResolverService from './FeeResolverService';
import LocationNameService from './LocationNameService';
import { genStoredBook } from './bookOrders';

@Service()
export default class TradeService {

  constructor(
    private readonly characterContextService: CharacterContextService,
    private readonly feeResolver: FeeResolverService,
    private readonly tradeSettingsService: TradeSettingsService,
    private readonly locationNameService: LocationNameService,
  ) { }

  /** The account's buy and sell stations, and fee rates there for each selected character. */
  public async genxFeeRates(actorContext: ActorContext): Promise<TradeFeeRatesRes> {
    const [characters, stations, locations] = await Promise.all([
      actorContext.genLoggedInSelectedCharacters(),
      this.tradeSettingsService.genxStations(actorContext),
      this.tradeSettingsService.genxLocations(actorContext),
    ]);
    const location = (locationId: number) =>
      locations.find((l) => l.locationId === locationId)!;
    return {
      buyLocation: location(stations.buyLocationId),
      sellLocation: location(stations.sellLocationId),
      characters: await Promise.all(characters.map(async ({ characterId, characterName }) => {
        try {
          const trader = await this.characterContextService.genxTrader(characterId);
          return {
            characterId,
            characterName,
            error: null,
            buyRates: this.feeResolver.feeRates(trader, stations.buyLocationId),
            sellRates: this.feeResolver.feeRates(trader, stations.sellLocationId),
          };
        } catch (error) {
          console.error(`Fee rates failed for ${characterId}`, error);
          return {
            characterId,
            characterName,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      })),
    };
  }

  public async genxBook(actorContext: ActorContext, typeId: number): Promise<TradeBookRes> {
    const { orders, observedAt } = await genStoredBook([typeId]);
    const locationNames = await this.locationNameService.genShortNames(
      actorContext,
      orders.map((order) => order.locationId),
    );
    return { observedAt, locationNames, orders };
  }
}
