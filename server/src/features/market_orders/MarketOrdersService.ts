import { Service } from 'typedi';
import EveSdeData from '../../core/sde/EveSdeData';
import type { EsiMarketOrder } from 'eve-esi';
import EsiQueryService from '../../core/esi/EsiQueryService';
import {
  MarketOrdersComparisonRes,
  MarketOrdersComparisonWithErrorsRes,
  MarketOrdersRes,
} from '@internal/shared';
import ActorContext from '../../core/actor_context/ActorContext';
import {
  genNullOnEsiError,
  genQueryFlatPerCharacter,
  genQueryResultIfAvailable,
} from '../../lib/eveUtil';
import StationService from '../../core/query/StationService';
import ItemQuantitiesParserService, {
  ItemQuantity,
} from '../item_quantities/ItemQuantitiesParserService';
import { chain } from 'underscore';
import {
  FeeRates,
  OrderStandingRes,
  orderStanding,
  repriceOption,
  TradeBookOrderRes,
} from '@internal/shared';
import { EsiCharacter } from '../../core/esi/models/EsiCharacter';
import CharacterContextService from '../character_context/CharacterContextService';
import { Trader } from '../character_context/characterTrading';
import FeeResolverService from '../fees/FeeResolverService';
import LocationNameService from '../../core/query/LocationNameService';
import { genStoredBook } from '../market_order_book/storedBook';
import TradeSettingsService from '../trade_settings/TradeSettingsService';

@Service()
export default class MarketOrdersService {
  constructor(
    private readonly sdeData: EveSdeData,
    private readonly esiQuery: EsiQueryService,
    private readonly stationService: StationService,
    private readonly itemQuantitiesParser: ItemQuantitiesParserService,
    private readonly characterContextService: CharacterContextService,
    private readonly feeResolver: FeeResolverService,
    private readonly locationNameService: LocationNameService,
    private readonly tradeSettingsService: TradeSettingsService,
  ) {}

  /** Returns all data needed for the Market Orders page. */
  public async genMarketOrdersForAccount(
    actorContext: ActorContext,
    typeId: number | null = null,
  ): Promise<MarketOrdersRes> {
    const orders = (await genQueryFlatPerCharacter(actorContext, (character) =>
      this.esiQuery.genxCharacterMarketOrders(character.characterId)
    )).filter(([_, o]) => typeId === null || o.type_id === typeId);

    const [stationNames, traders, standings] = await Promise.all([
      this.stationService.genAllStationNames(
        actorContext,
        orders.map(([_, o]) => o.location_id)
      ),
      this.genTraders(orders.map(([character]) => character)),
      this.genStandings(actorContext, orders.map(([_, o]) => o)),
    ]);

    return orders
      .filter(([_, o]) => !o.is_corporation)
      .map(([character, o]) => ({
        ...this.repriceFees(traders.get(character.characterId) ?? null, o),
        characterName: character.characterName,
        typeId: o.type_id,
        name: this.sdeData.types[o.type_id]?.name,
        categoryId: this.sdeData.categoryIdFromTypeId(o.type_id),
        locationName: stationNames[o.location_id] ?? null,
        locationId: o.location_id,
        price: o.price,
        volumeRemain: o.volume_remain,
        volumeTotal: o.volume_total,
        isBuy: o.is_buy_order ?? false,
        issuedDate: o.issued,
        duration: o.duration,
        orderId: o.order_id,
        standing: standings?.get(o.order_id) ?? null,
      }));
  }

  /** Null when the stored book could not be read; the page still works without it. */
  private async genStandings(
    actorContext: ActorContext,
    orders: EsiMarketOrder[],
  ): Promise<Map<number, OrderStandingRes> | null> {
    try {
      const [station, { orders: book }] = await Promise.all([
        this.tradeSettingsService.genxTradingStation(actorContext),
        genStoredBook(chain(orders).pluck('type_id').uniq().value()),
      ]);
      const ownOrderIds = new Set(orders.map((order) => order.order_id));
      const bookById = new Map(book.map((order) => [order.orderId, order]));
      const bookByType = chain(book).groupBy('typeId').value();
      const standings = orders.map((order) => [
        order.order_id,
        orderStanding(
          bookById.get(order.order_id) ?? this.asBookOrder(order),
          bookByType[order.type_id] ?? [],
          station,
          ownOrderIds,
        ),
      ] as const);
      const names = await this.locationNameService.genShortNames(actorContext, [
        station.locationId,
        ...standings.flatMap(([_, s]) => (s.status === 'outbid' ? [s.bestLocationId] : [])),
      ]);
      return new Map(standings.map(([orderId, standing]): [number, OrderStandingRes] => {
        switch (standing.status) {
          case 'top':
            return [orderId, standing];
          case 'outbid':
            return [orderId, {
              status: 'outbid',
              bestPrice: standing.bestPrice,
              bestLocationName: names[standing.bestLocationId] ?? null,
              ordersAhead: standing.ordersAhead,
            }];
          default:
            return [orderId, { status: 'away', stationName: names[station.locationId] ?? null }];
        }
      }));
    } catch (error) {
      console.error('Order standings failed', error);
      return null;
    }
  }

  /** Orders outside the stored book, e.g. at a station it does not cover. */
  private asBookOrder(order: EsiMarketOrder): TradeBookOrderRes {
    return {
      orderId: order.order_id,
      typeId: order.type_id,
      locationId: order.location_id,
      systemId: order.system_id ?? this.stationService.knownSystemId(order.location_id) ?? 0,
      isBuy: order.is_buy_order ?? false,
      price: order.price,
      volumeRemain: order.volume_remain,
      minVolume: order.min_volume ?? 1,
      range: order.range,
      issued: order.issued,
    };
  }

  /** Null for a character whose skills or standings could not be read. */
  private async genTraders(characters: EsiCharacter[]): Promise<Map<number, Trader | null>> {
    const unique = chain(characters).uniq(false, (character) => character.characterId).value();
    const entries = await Promise.all(unique.map(async (character) => {
      try {
        const trader = await this.characterContextService.genxTrader(character.characterId);
        return [character.characterId, trader] as const;
      } catch (error) {
        console.error(`Trader failed for ${character.characterId}`, error);
        return [character.characterId, null] as const;
      }
    }));
    return new Map(entries);
  }

  private repriceFees(
    trader: Trader | null,
    order: EsiMarketOrder,
  ): { modifyFee: number | null; replaceFee: number | null } {
    const rates: FeeRates | null = trader === null
      ? null
      : this.feeResolver.feeRates(trader, order.location_id);
    if (rates === null) {
      return { modifyFee: null, replaceFee: null };
    }
    const value = order.price * order.volume_remain;
    const option = repriceOption(rates, value, value);
    return { modifyFee: option.modifyFee, replaceFee: option.replaceFee };
  }

  /**
   * Fetches all market orders in station with `stationId`
   * for all items in `content`.
   */
  public async genMarketOrders(
    actorContext: ActorContext,
    stationIds: number[],
    content: string
  ): Promise<MarketOrdersComparisonWithErrorsRes> {
    const { itemQuantities, errors } = this.itemQuantitiesParser.parseItemQuantities(content);
    if (errors.length !== 0) {
      return errors;
    }
    const main = await actorContext.genxMainCharacter();

    return await Promise.all(
      stationIds.map(async (stationId) => {
        const stationData = this.sdeData.stations[stationId];
        if (stationData === undefined) {
          const structure = await genQueryResultIfAvailable(actorContext, ({ characterId }) =>
            genNullOnEsiError(() => this.esiQuery.genxStructure(characterId, stationId))
          );
          const orders =
            (await genQueryResultIfAvailable(actorContext, ({ characterId }) =>
              genNullOnEsiError(() =>
                this.esiQuery.genxAllStructureMarketOrders(characterId, stationId)
              )
            )) ?? [];
          return {
            stationId,
            stationName: structure?.name ?? '',
            items: await this.genLowestItemPrices(orders, itemQuantities),
          };
        }

        const regionId = this.sdeData.regionIdFromStationId(stationId);
        const types = itemQuantities.map(({ name }) => this.sdeData.typeByName[name]);
        const orders = await Promise.all(
          types.map(async ({ id }) => {
            const orders = await this.esiQuery.genxAllRegionMarketOrders(regionId!, {
              typeId: id,
            });
            return orders;
          })
        );
        return {
          stationId,
          stationName: (await this.stationService.genStationName(main, stationId)) ?? '',
          items: await this.genLowestItemPrices(orders.flat(), itemQuantities),
        };
      })
    );
  }

  /** Finds the lowest price from the orders for each item. */
  private async genLowestItemPrices(
    orders: EsiMarketOrder[],
    itemQuantities: ItemQuantity[]
  ): Promise<MarketOrdersComparisonRes[number]['items']> {
    const typeQuantities = Object.fromEntries(
      itemQuantities.map(({ name, quantity }) => [this.sdeData.typeByName[name]?.id, quantity])
    );
    return chain(orders)
      .filter((order) => order?.is_buy_order === false)
      .filter(({ type_id }) => type_id in typeQuantities)
      .groupBy('type_id')
      .pairs()
      .map(([typeIdStr, typeOrders]) => {
        const typeId = Number(typeIdStr);
        const quantity = typeQuantities[typeId];
        // TODO handle price and quantity
        return {
          typeId,
          categoryId: this.sdeData.categoryIdFromTypeId(typeId),
          name: this.sdeData.types[typeId].name,
          price: typeOrders.length === 0
            ? null
            : Math.min(...typeOrders.map(({ price }) => price)),
          quantity,
        };
      })
      .value();
  }
}
