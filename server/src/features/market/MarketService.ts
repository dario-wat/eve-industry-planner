import { Service } from 'typedi';
import EveSdeData from '../../core/sde/EveSdeData';
import EsiTokenlessQueryService from '../../core/query/EsiTokenlessQueryService';
import EveQueryService from '../../core/query/EveQueryService';
import { MarketOrdersRes } from '@internal/shared';
import ActorContext from '../../core/actor_context/ActorContext';
import { genQueryFlatPerCharacter } from '../../lib/eveUtil';
import StationService from '../../core/query/StationService';


@Service()
export default class MarketService {

  constructor(
    private readonly eveQuery: EveQueryService,
    private readonly sdeData: EveSdeData,
    private readonly esiQuery: EsiTokenlessQueryService,
    private readonly stationService: StationService,
  ) { }

  /** Returns all data needed for the Market Orders page. */
  public async genMarketOrdersForAccount(
    actorContext: ActorContext,
  ): Promise<MarketOrdersRes> {
    const orders = await genQueryFlatPerCharacter(
      actorContext,
      character => this.esiQuery.genxCharacterMarketOrders(character.characterId),
    );

    const stationNames = await this.stationService.genAllStationNames(
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