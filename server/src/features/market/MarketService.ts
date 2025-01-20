import { Service } from 'typedi';
import EveSdeData from '../../core/sde/EveSdeData';
import EsiTokenlessQueryService from '../../core/query/EsiTokenlessQueryService';
import {
  MarketHistoryRes,
  MarketOrdersComparisonRes,
  MarketOrdersComparisonWithErrorsRes,
  MarketOrdersRes,
} from '@internal/shared';
import ActorContext from '../../core/actor_context/ActorContext';
import { genQueryFlatPerCharacter, genQueryResultIfAvailable } from '../../lib/eveUtil';
import StationService from '../../core/query/StationService';
import { THE_FORGE } from '../../const/IDs';
import { differenceInDays, parse } from 'date-fns';
import EsiMultiPageQueryService from '../../core/query/EsiMultiPageQueryService';
import ItemQuantitiesParserService, {
  ItemQuantity,
} from '../item_quantities/ItemQuantitiesParserService';
import { chain } from 'underscore';
import { EveMarketOrder } from 'types/EsiQuery';

const MAX_HISTORY_DAYS = 90;

@Service()
export default class MarketService {
  constructor(
    private readonly sdeData: EveSdeData,
    private readonly esiQuery: EsiTokenlessQueryService,
    private readonly stationService: StationService,
    private readonly esiMultipageueryService: EsiMultiPageQueryService,
    private readonly itemQuantitiesParser: ItemQuantitiesParserService
  ) {}

  /** Returns all data needed for the Market Orders page. */
  public async genMarketOrdersForAccount(actorContext: ActorContext): Promise<MarketOrdersRes> {
    const orders = await genQueryFlatPerCharacter(actorContext, (character) =>
      this.esiQuery.genxCharacterMarketOrders(character.characterId)
    );

    const stationNames = await this.stationService.genAllStationNames(
      actorContext,
      orders.map(([_, o]) => o.location_id)
    );

    return orders
      .filter(([_, o]) => !o.is_corporation)
      .map(([character, o]) => ({
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
      }));
  }

  /** Fetches market history for a single typeId. */
  public async genMarketHistory(
    actorContext: ActorContext,
    typeName: string
  ): Promise<MarketHistoryRes> {
    const main = await actorContext.genxMainCharacter();
    const history = await this.esiQuery.genxRegionMarketHistory(
      main.characterId,
      THE_FORGE,
      this.sdeData.typeByName[typeName]?.id
    );

    const today = new Date();
    return history.filter(
      (h) => differenceInDays(today, parse(h.date, 'yyyy-MM-dd', new Date())) < MAX_HISTORY_DAYS
    );
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
            this.esiQuery.genStructure(characterId, stationId)
          );
          const orders =
            (await genQueryResultIfAvailable(actorContext, (character) =>
              this.esiMultipageueryService.genAllStructureMarketOrders(character, stationId)
            )) ?? [];
          return {
            stationId,
            stationName: structure?.name ?? '',
            items: await this.genLowestItemPrices(orders, itemQuantities),
          };
        }

        const types = itemQuantities.map(({ name }) => this.sdeData.typeByName[name]);
        const orders = await Promise.all(
          types.map(async ({ id }) => {
            const orders = await this.esiMultipageueryService.genxAllRegionMarketOrders(
              main,
              stationData.region_id,
              id
            );
            return orders;
          })
        );
        return {
          stationId,
          stationName: stationData.name,
          items: await this.genLowestItemPrices(orders.flat(), itemQuantities),
        };
      })
    );
  }

  // TODO handle quantities
  /** Finds the lowest price from the orders for each item. */
  private async genLowestItemPrices(
    orders: EveMarketOrder[],
    itemQuantities: ItemQuantity[]
  ): Promise<MarketOrdersComparisonRes[number]['items']> {
    const types = itemQuantities.map(({ name }) => this.sdeData.typeByName[name]);
    const typeIds = new Set(types.map(({ id }) => id));
    return chain(orders)
      .filter((order) => order?.is_buy_order === false)
      .filter(({ type_id }) => typeIds.has(type_id))
      .groupBy('type_id')
      .pairs()
      .map(([typeId, typeOrders]) => {
        return {
          typeId: Number(typeId),
          categoryId: this.sdeData.categoryIdFromTypeId(Number(typeId)),
          name: this.sdeData.types[Number(typeId)].name,
          price: typeOrders.length === 0 ? null : Math.min(...typeOrders.map(({ price }) => price)),
        };
      })
      .value();
  }
}
