import ESI, { Token } from 'eve-esi-client';
import { Service } from 'typedi';
import {
  EveAsset,
  EveAssetName,
  EveConstellation,
  EveContract,
  EveIndustryJob,
  EveMarketHistory,
  EveMarketOrder,
  EveMarketOrderType,
  EveName,
  EvePortrait,
  EveSolarSystem,
  EveStructure,
  EveWalletJournalEntry,
  EveWalletTransaction,
} from '../../types/EsiQuery';
import EsiProviderService from './EsiProviderService';
import { AppLog } from '../logger/AppLog';

export type EsiMultiPageResult<T> = {
  data: T[],
  pages: number,
};

/*
* This is a library of ESI (EVE Swagger Interface) queries.
* All functions simply query ESI and return JSON so the whole library
* is just a simplification of ESI itself. There are no modifications
* to the returned resul, no exceptions handling and no special cases.
* For more complex queries check out EveQueryService.
*
* Each function comes in two forms: genx throws errors
* and gen swallows them and returns null instead.
*/
@Service()
export default class EsiQueryService {

  private readonly esi: ESI;

  constructor(
    esiProviderService: EsiProviderService,
  ) {
    this.esi = esiProviderService.get();
  }

  /*
    Industry jobs example object
    {
      "activity_id": 8,
      "blueprint_id": 1039524206166,
      "blueprint_location_id": 1039362132152,
      "blueprint_type_id": 2604,
      "cost": 120,
      "duration": 28152,
      "end_date": "2022-08-13T01:55:30Z",
      "facility_id": 1038046192011,
      "installer_id": 1838729723,
      "job_id": 497348335,
      "licensed_runs": 200,
      "output_location_id": 1039362132466,
      "probability": 0.4334999918937683,
      "product_type_id": 2606,
      "runs": 3,
      "start_date": "2022-08-12T18:06:18Z",
      "station_id": 1038046192011,
      "status": "active"
    }
  */
  public async genxIndustryJobs(
    token: Token,
    characterId: number,
    includeCompleted: boolean = false,
  ): Promise<EveIndustryJob[]> {
    const response = await this.esi.request(
      `/characters/${characterId}/industry/jobs/`,
      { include_completed: includeCompleted },
      undefined,
      { token },
    );
    return await response.json();
  }

  public async genIndustryJobs(
    token: Token,
    characterId: number,
    includeCompleted: boolean = false,
  ): Promise<EveIndustryJob[] | null> {
    return await this.genxIndustryJobs(token, characterId, includeCompleted)
      .catch(logEsiErrorAndReturnNull);
  }

  /*
    Structure example object
    {
      name: 'O-IVNH - Step Two',
      owner_id: 98696731,
      position: { x: -383948200684, y: 475242663232, z: -832151676935 },
      solar_system_id: 30004049,
      type_id: 35826
    }
  */
  public async genxStructure(
    token: Token,
    structureId: number,
  ): Promise<EveStructure> {
    const response = await this.esi.request(
      `/universe/structures/${structureId}/`,
      undefined,
      undefined,
      { token },
    );
    return await response.json();
  }

  public async genStructure(
    token: Token,
    structureId: number,
  ): Promise<EveStructure | null> {
    return await this.genxStructure(token, structureId)
      .catch(logEsiErrorAndReturnNull);
  }

  /*
    Solar system example object:
    {
      "constellation_id": 20000691,
      "name": "E3OI-U",
      "planets": [
        {
          "asteroid_belts": [40299082, 40299083, 40299084, 40299087],
          "moons": [40299085, 40299086, 40299088],
          "planet_id": 40299081
        },
        {
          "moons": [40299090],
          "planet_id": 40299089
        },
        {
          "moons": [
            40299092, 40299093, 40299094, 40299095, 40299096, 40299097,
            40299098, 40299099, 40299100, 40299101, 40299102, 40299103,
            40299104
          ],
          "planet_id": 40299091
        },
        {
          "moons": [
            40299106, 40299107, 40299108, 40299109, 40299110, 40299111,
            40299112, 40299113, 40299114, 40299115, 40299116, 40299117,
            40299118, 40299119, 40299120
          ],
          "planet_id": 40299105
        },
        {
          "asteroid_belts": [40299122],
          "moons": [40299123, 40299124, 40299125],
          "planet_id": 40299121
        }
      ],
      "position": {
        "x": -429785458560803840,
        "y": 55986490854246150,
        "z": -226681473350494530
      },
      "security_class": "G",
      "security_status": -0.04511237144470215,
      "star_id": 40299080,
      "stargates": [50010588, 50010589, 50010590, 50010591],
      "system_id": 30004725
    }
  */
  public async genxSolarSystem(
    token: Token,
    systemId: number,
  ): Promise<EveSolarSystem> {
    const response = await this.esi.request(
      `/universe/systems/${systemId}`,
      undefined,
      undefined,
      { token },
    );
    return await response.json();
  }

  public async genSolarSystem(
    token: Token,
    systemId: number,
  ): Promise<EveSolarSystem | null> {
    return await this.genxSolarSystem(token, systemId)
      .catch(logEsiErrorAndReturnNull);
  }

  /*
    Example constellation object:
    {
      "constellation_id": 20000691,
      "name": "O5K-Y6",
      "position": {
        "x": -429956931523100740,
        "y": 58891568439957010,
        "z": -222333617049187420
      },
      "region_id": 10000060,
      "systems": [30004724, 30004725, 30004726, 30004727, 30004728, 30004729]
    }
  */
  public async genxConstellation(
    token: Token,
    constellationId: number,
  ): Promise<EveConstellation> {
    const response = await this.esi.request(
      `/universe/constellations/${constellationId}`,
      undefined,
      undefined,
      { token },
    );
    return await response.json();
  }

  public async genConstellation(
    token: Token,
    constellationId: number,
  ): Promise<EveConstellation | null> {
    return await this.genxConstellation(token, constellationId)
      .catch(logEsiErrorAndReturnNull);
  }

  /*
    @param page
      We can't query all assets a once, we need to query the specific
      page of results.
    So this function itself is not that useful. Check out genxAllAssets.
    
    Assets example object
    {
      "is_singleton": true,
      "item_id": 101408250,
      "location_flag": "MedSlot3",
      "location_id": 1039362657808,
      "location_type": "item",
      "quantity": 1,
      "type_id": 3244
    }

    Location for the assets can be station, structure, container,
    ship, customs office, POS and other things. However, the root can
    only be station, structure, custom office, POS (other?).
    For the simplicity I will visualize only the station/structure graph.

                Station/structure
          ______________|_______________
          |             |               |
        Item          Container         Ship
                        |            ____|_____
                      Item          |          |
                                  Item        Container
                                               |
                                              Item
  */
  public async genxAssets(
    token: Token,
    characterId: number,
    page: number = 1,
  ): Promise<EsiMultiPageResult<EveAsset>> {
    const response = await this.esi.request(
      `/characters/${characterId}/assets/`,
      { page },
      undefined,
      { token },
    );
    return {
      data: await response.json(),
      pages: Number(response.headers['x-pages']),
    };
  }

  public async genAssets(
    token: Token,
    characterId: number,
    page: number = 1,
  ): Promise<EsiMultiPageResult<EveAsset> | null> {
    return await this.genxAssets(token, characterId, page)
      .catch(logEsiErrorAndReturnNull);
  }

  /*
    This function can be used to find out the names of named objects
    such as ships or containers.
    @param itemIds 
      IDs of the items returned by the genAssets functions. It can contain
      at most 1000 elements. 
    This function on its own is not that useful. Check out genAssetNames
    
    Asset names example object
    [
      { item_id: 360052160, name: 'I do shit' },
      { item_id: 945371609, name: '[B] Originals' },
      { item_id: 962104165, name: '[B] Copies' },
      { item_id: 1086967686, name: "Daki Razarac's Zephyr" },
      { item_id: 1702215246, name: 'Pac-Man' },
    ]
  */
  public async genxAssetNames(
    token: Token,
    characterId: number,
    itemIds: number[],  // max 1000 elements
  ): Promise<EveAssetName[]> {
    const response = await this.esi.request(
      `/characters/${characterId}/assets/names/`,
      undefined,
      itemIds,
      { token, method: 'POST' }
    );
    return await response.json();
  }

  public async genAssetNames(
    token: Token,
    characterId: number,
    itemIds: number[],  // max 1000 elements
  ): Promise<EveAssetName[] | null> {
    return await this.genxAssetNames(token, characterId, itemIds)
      .catch(logEsiErrorAndReturnNull);
  }

  /*
    Contract example object:
    {
      "acceptor_id": 0,
      "assignee_id": 99011162,
      "availability": "personal",
      "collateral": 0,
      "contract_id": 184223651,
      "date_expired": "2022-09-11T16:30:52Z",
      "date_issued": "2022-08-14T16:30:52Z",
      "days_to_complete": 0,
      "end_location_id": 1038502060900,
      "for_corporation": false,
      "issuer_corporation_id": 98306352,
      "issuer_id": 1838729723,
      "price": 280000000,
      "reward": 0,
      "start_location_id": 1038502060900,
      "status": "outstanding",
      "title": "NEW Cerb doctrine",
      "type": "item_exchange",
      "volume": 92000
    }
  */
  public async genxContracts(
    token: Token,
    characterId: number,
    page: number = 1,
  ): Promise<EsiMultiPageResult<EveContract>> {
    const response = await this.esi.request(
      `/characters/${characterId}/contracts/`,
      { page },
      undefined,
      { token },
    );
    return {
      data: await response.json(),
      pages: Number(response.headers['x-pages']),
    };
  }

  public async genContracts(
    token: Token,
    characterId: number,
    page: number = 1,
  ): Promise<EsiMultiPageResult<EveContract> | null> {
    return await this.genxContracts(token, characterId, page)
      .catch(logEsiErrorAndReturnNull);
  }

  /*
    Note: try not to use this function directly since it doesn't
    sanitize the input. For example, ESI will throw an exception
    if the list of IDs is not unique.
    
    Example object:
    [
      { category: 'character', id: 1688205171, name: 'Trading Lady' },
      { category: 'character', id: 1838729723, name: 'Daki Razarac' },
      { category: 'character', id: 1384661776, name: 'Pobjesnjeli Dario' },
      { category: 'alliance', id: 99011162, name: 'Shadow Ultimatum' },
      { category: 'corporation', id: 98702206, name: 'Hot Foot Powder' },
      { category: 'corporation', id: 98143250, name: 'Prairie Doggers' }
    ]
  */
  public async genxNames(token: Token, ids: number[]): Promise<EveName[]> {
    const response = await this.esi.request(
      '/universe/names/',
      undefined,
      ids,
      { token, method: 'POST' }
    );
    return await response.json();
  }

  public async genNames(
    token: Token,
    ids: number[],
  ): Promise<EveName[] | null> {
    return await this.genxNames(token, ids).catch(logEsiErrorAndReturnNull);
  }

  /*
    Example object:
    {
      px64x64: "https://images.evetech.net/characters/1838729723/portrait?tenant=tranquility&size=64"
      px128x128: "https://images.evetech.net/characters/1838729723/portrait?tenant=tranquility&size=128"
      px256x256: "https://images.evetech.net/characters/1838729723/portrait?tenant=tranquility&size=256"
      px512x512: "https://images.evetech.net/characters/1838729723/portrait?tenant=tranquility&size=512"
    }
  */
  public async genxPortrait(
    token: Token,
    characterId: number,
  ): Promise<EvePortrait> {
    const response = await this.esi.request(
      `/characters/${characterId}/portrait/`,
      undefined,
      undefined,
      { token },
    );
    return await response.json();
  }

  public async genPortrait(
    token: Token,
    characterId: number,
  ): Promise<EvePortrait | null> {
    return await this.genxPortrait(token, characterId)
      .catch(logEsiErrorAndReturnNull);
  }

  /*
    Example object:
    {
      client_id: 2119236428,
      date: '2022-09-30T03:04:17Z',
      is_buy: true,
      is_personal: true,
      journal_ref_id: 20822226074,
      location_id: 1038502060900,
      quantity: 1000,
      transaction_id: 5925930334,
      type_id: 12767,
      unit_price: 400
    }
  */
  public async genxWalletTransactions(
    token: Token,
    characterId: number,
  ): Promise<EveWalletTransaction[]> {
    const response = await this.esi.request(
      `/characters/${characterId}/wallet/transactions/`,
      undefined,
      undefined,
      { token },
    );
    return await response.json();
  }

  public async genWalletTransactions(
    token: Token,
    characterId: number,
  ): Promise<EveWalletTransaction[] | null> {
    return await this.genxWalletTransactions(token, characterId)
      .catch(logEsiErrorAndReturnNull);
  }

  /*
    Example object:
    {
      amount: 428700000,
      balance: 4151951012.7678,
      context_id: 6281722078,
      context_id_type: 'market_transaction_id',
      date: '2024-03-30T20:05:37Z',
      description: 'Market: Roxane Barviainen bought stuff from Trading Lady',
      first_party_id: 96289381,
      id: 22659767215,
      reason: '',
      ref_type: 'market_transaction',
      second_party_id: 1688205171
    }
  */
  public async genxWalletJournal(
    token: Token,
    characterId: number,
    page: number = 1,
  ): Promise<EsiMultiPageResult<EveWalletJournalEntry>> {
    const response = await this.esi.request(
      `/characters/${characterId}/wallet/journal/`,
      { page },
      undefined,
      { token },
    );
    return {
      data: await response.json(),
      pages: Number(response.headers['x-pages']),
    };
  }

  public async genWalletJournal(
    token: Token,
    characterId: number,
    page: number = 1,
  ): Promise<EsiMultiPageResult<EveWalletJournalEntry> | null> {
    return await this.genxWalletJournal(token, characterId, page)
      .catch(logEsiErrorAndReturnNull);
  }

  /*
    Example object:
    {
      duration: 90,
      is_corporation: false,
      issued: '2022-09-19T16:40:57Z',
      location_id: 1038502060900,
      order_id: 6340708290,
      price: 16950000,
      range: 'region',
      region_id: 10000051,
      type_id: 626,
      volume_remain: 4,
      volume_total: 6
    }
  */
  public async genxCharacterMarketOrders(
    token: Token,
    characterId: number,
  ): Promise<EveMarketOrder[]> {
    const response = await this.esi.request(
      `/characters/${characterId}/orders/`,
      undefined,
      undefined,
      { token },
    );
    return await response.json();
  }

  public async genCharacterMarketOrders(
    token: Token,
    characterId: number,
  ): Promise<EveMarketOrder[] | null> {
    return await this.genxCharacterMarketOrders(token, characterId)
      .catch(logEsiErrorAndReturnNull);
  }

  /*
    Example object:
    {
      duration: 365,
      is_buy_order: false,
      issued: '2023-08-21T11:07:47Z',
      location_id: 60002392,
      min_volume: 1,
      order_id: 4992795078,
      price: 10000000,
      range: 'region',
      system_id: 30001397,
      type_id: 46198,
      volume_remain: 20,
      volume_total: 20
    }
  */
  public async genxRegionMarketOrders(
    token: Token,
    regionId: number,
    typeId: number,
    orderType: EveMarketOrderType = 'all',
    page: number = 1,
  ): Promise<EsiMultiPageResult<EveMarketOrder>> {
    const response = await this.esi.request(
      `/markets/${regionId}/orders/`,
      {
        type_id: typeId,
        page,
        order_type: orderType
      },
      undefined,
      { token },
    );
    return {
      data: await response.json(),
      pages: Number(response.headers['x-pages']),
    };
  }

  public async genRegionMarketOrders(
    token: Token,
    regionId: number,
    typeId: number,
    orderType: EveMarketOrderType = 'all',
    page: number = 1,
  ): Promise<EsiMultiPageResult<EveMarketOrder> | null> {
    return await this.genxRegionMarketOrders(token, regionId, typeId, orderType, page)
      .catch(logEsiErrorAndReturnNull);
  }

  /*
    Example object:
    {
      duration: 365,
      is_buy_order: false,
      issued: '2023-08-21T11:07:47Z',
      location_id: 60002392,
      min_volume: 1,
      order_id: 4992795078,
      price: 10000000,
      range: 'region',
      system_id: 30001397,
      type_id: 46198,
      volume_remain: 20,
      volume_total: 20
    }
   */
  public async genxStructureMarketOrders(
    token: Token,
    structureId: number,
    page: number = 1,
  ): Promise<EsiMultiPageResult<EveMarketOrder>> {
    const response = await this.esi.request(
      `/markets/structures/${structureId}/`,
      { page },
      undefined,
      { token },
    );
    return {
      data: await response.json(),
      pages: Number(response.headers['x-pages']),
    };
  }

  public async genStructureMarketOrders(
    token: Token,
    structureId: number,
    page: number = 1,
  ): Promise<EsiMultiPageResult<EveMarketOrder> | null> {
    return await this.genxStructureMarketOrders(token, structureId, page)
      .catch(logEsiErrorAndReturnNull);
  }

  /*
    Example object:
    [
      {
        average: 192000000,
        date: '2022-10-01',
        highest: 196000000,
        lowest: 183700000,
        order_count: 37,
        volume: 41
      },
      {
        average: 194973214.29,
        date: '2022-10-02',
        highest: 199050000,
        lowest: 183500000,
        order_count: 49,
        volume: 56
      },
      ...
    ]
  */
  public async genxRegionMarketHistory(
    token: Token,
    regionId: number,
    typeId: number,
  ): Promise<EveMarketHistory[]> {
    const response = await this.esi.request(
      `/markets/${regionId}/history/`,
      { type_id: typeId },
      undefined,
      { token },
    );
    return await response.json();
  }

  public async genRegionMarketHistory(
    token: Token,
    regionId: number,
    typeId: number,
  ): Promise<EveMarketHistory[] | null> {
    return await this.genxRegionMarketHistory(token, regionId, typeId)
      .catch(logEsiErrorAndReturnNull);
  }
}

/**
 * Helper functions to log an error and return null.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logEsiErrorAndReturnNull(e: any): Promise<null> {
  const errorJson = await e.json();
  await AppLog.warn('esi_query', errorJson);
  return null;
}