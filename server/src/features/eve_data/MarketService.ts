import { Service } from 'typedi';
import EveSdeData from '../../core/sde/EveSdeData';
import EsiTokenlessQueryService from '../../core/query/EsiTokenlessQueryService';
import EveQueryService from '../../core/query/EveQueryService';
import { MarketOrdersRes } from '@internal/shared';
import ActorContext from '../../core/actor_context/ActorContext';


@Service()
export default class MarketService {

  constructor(
    private readonly eveQuery: EveQueryService,
    private readonly sdeData: EveSdeData,
    private readonly esiQuery: EsiTokenlessQueryService,
  ) { }

  /** Returns all data needed for the Market Orders page. */
  public async genMarketOrdersForPage(
    actorContext: ActorContext,
  ): Promise<MarketOrdersRes> {
    const characters = await actorContext.genLinkedCharacters();

    const characterOrders = await Promise.all(characters.map(
      async character => ([
        character,
        await this.esiQuery.genxMarketOrders(character.characterId)
      ] as const),
    ));

    // TODO move to util? there is another one laying around here
    const orders = characterOrders.flatMap(([character, orders]) =>
      orders.map(order => ([character, order] as const))
    );

    // TODO this is ugly, make it better
    const stationNames = await this.eveQuery.genAllStationNamesForActor(
      actorContext,
      orders.map(([_, o]) => o.location_id),
    );

    return orders
      .filter(([_, o]) => !o.is_corporation)
      .map(([character, o]) => ({
        characterName: character.characterName,
        typeId: o.type_id,
        name: this.sdeData.types[o.type_id].name,
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
}