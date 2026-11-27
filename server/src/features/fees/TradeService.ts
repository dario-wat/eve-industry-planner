import { Service } from 'typedi';
import { Op } from 'sequelize';
import { TradeBookRes, TradeFeeRatesRes, TradePricesRes } from '@internal/shared';
import ActorContext from '../../core/actor_context/ActorContext';
import { TRADE_LOCATIONS } from '../../const/IDs';
import CharacterContextService from '../character_context/CharacterContextService';
import { MarketOrderOpen } from '../market_order_book/MarketOrderOpen';
import TradeSettingsService from '../trade_settings/TradeSettingsService';
import FeeResolverService from './FeeResolverService';

@Service()
export default class TradeService {

  constructor(
    private readonly characterContextService: CharacterContextService,
    private readonly feeResolver: FeeResolverService,
    private readonly tradeSettingsService: TradeSettingsService,
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

  public async genxBook(typeId: number): Promise<TradeBookRes> {
    const orders = await MarketOrderOpen.findAll({
      where: { type_id: typeId, missing: false },
      raw: true,
    });
    const observedAt = orders.reduce<number | null>((latest, order) => {
      const time = new Date(order.observed_at).getTime();
      return latest === null || time > latest ? time : latest;
    }, null);
    return {
      observedAt: observedAt === null ? null : new Date(observedAt).toISOString(),
      orders: orders.map((order) => ({
        orderId: Number(order.order_id),
        locationId: Number(order.location_id),
        systemId: order.system_id,
        isBuy: Boolean(order.is_buy),
        price: order.price,
        volumeRemain: Number(order.volume_remain),
        minVolume: Number(order.min_volume),
        range: order.range,
        issued: new Date(order.issued).toISOString(),
      })),
    };
  }

  /**
   * Best buy and sell price among orders placed at each trade location. Ranged buy orders
   * placed elsewhere that would also match a sale there are not counted.
   */
  public async genxPrices(typeId: number): Promise<TradePricesRes> {
    const orders = await MarketOrderOpen.findAll({
      attributes: ['location_id', 'is_buy', 'price', 'observed_at'],
      where: {
        type_id: typeId,
        location_id: { [Op.in]: [...TRADE_LOCATIONS] },
        missing: false,
      },
      raw: true,
    });
    const observedAt = orders.reduce<number | null>((latest, order) => {
      const time = new Date(order.observed_at).getTime();
      return latest === null || time > latest ? time : latest;
    }, null);
    return {
      observedAt: observedAt === null ? null : new Date(observedAt).toISOString(),
      locations: TRADE_LOCATIONS.map((locationId) => {
        const here = orders.filter((order) => Number(order.location_id) === locationId);
        const prices = (isBuy: boolean) => here
          .filter((order) => Boolean(order.is_buy) === isBuy)
          .map((order) => order.price);
        const buys = prices(true);
        const sells = prices(false);
        return {
          locationId,
          bestBuy: buys.length === 0 ? null : Math.max(...buys),
          bestSell: sells.length === 0 ? null : Math.min(...sells),
        };
      }),
    };
  }
}
