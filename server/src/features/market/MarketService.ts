import { Service } from 'typedi';
import EveSdeData from '../../core/sde/EveSdeData';
import EsiTokenlessQueryService from '../../core/query/EsiTokenlessQueryService';
import { MarketHistoryRes, MarketOrdersComparisonRes, MarketOrdersRes } from '@internal/shared';
import ActorContext from '../../core/actor_context/ActorContext';
import { genQueryFlatPerCharacter } from '../../lib/eveUtil';
import StationService, { StationData } from '../../core/query/StationService';
import { THE_FORGE } from '../../const/IDs';
import { differenceInDays, parse } from 'date-fns';
import EsiMultiPageQueryService from '../../core/query/EsiMultiPageQueryService';
import ItemQuantitiesParserService, {
  ItemQuantity,
} from '../item_quantities/ItemQuantitiesParserService';
import { EsiCharacter } from '../../core/esi/models/EsiCharacter';
import EveQueryService from '../../core/query/EveQueryService';

const MAX_HISTORY_DAYS = 90;

@Service()
export default class MarketService {
  constructor(
    private readonly sdeData: EveSdeData,
    private readonly esiQuery: EsiTokenlessQueryService,
    private readonly eveQuery: EveQueryService,
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
  ): Promise<MarketOrdersComparisonRes> {
    const { itemQuantities, errors } = this.itemQuantitiesParser.parseItemQuantities(content);
    if (errors.length !== 0) {
      // return errors;
      // TODO
    }
    const main = await actorContext.genxMainCharacter();

    return await Promise.all(
      stationIds.map(async (stationId) => {
        const stationData = await this.stationService.genStationData(actorContext, stationId);
        // TODO what if null ?
        console.log(stationData);
        console.log(main);
        // TODO need different endpoint for structure markets
        const regionData = await this.genMarketItemLowestPricesForStation(
          main,
          stationData!,
          itemQuantities
        );
        return {
          stationId,
          stationName: stationData!.name,
          items: regionData,
        };
      })
    );
  }

  /**
   * Finds the lowest price for each item in the given station if the item is
   * sold in the station. Otherwise the price is set to null;
   */
  private async genMarketItemLowestPricesForStation(
    main: EsiCharacter,
    stationData: StationData,
    itemQuantities: ItemQuantity[]
  ): Promise<
    { name: string; typeId: number; categoryId: number | undefined; price: number | null }[]
  > {
    const types = itemQuantities.map(({ name }) => this.sdeData.typeByName[name]);
    const prices = await Promise.all(
      types.map(async ({ id, name }) => ({
        typeId: id,
        categoryId: this.sdeData.categoryIdFromTypeId(id),
        name,
        price: await this.genLowestPriceForItem(main, stationData, id, 0),
      }))
    );
    return prices;
  }

  // TODO handle quantities
  /** Finds the lowest price the given item in the station. */
  private async genLowestPriceForItem(
    character: EsiCharacter,
    { stationId, regionId }: StationData,
    typeId: number,
    quantity: number
  ): Promise<number | null> {
    const orders = await this.esiMultipageueryService.genxAllRegionMarketOrders(
      character,
      regionId,
      typeId
    );
    console.log(orders);
    const sellOrderPrices = orders
      .filter((order) => order.is_buy_order === false && order.location_id === stationId)
      .map(({ price }) => price);
    return sellOrderPrices.length === 0 ? null : Math.min(...sellOrderPrices);
  }
}
