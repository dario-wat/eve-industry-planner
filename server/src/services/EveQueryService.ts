import ESI, { Token } from 'eve-esi-client';
import { Service } from 'typedi';
import EsiProviderService from './EsiProviderService';

/*
* Each function comes in two forms: genx throws errors
* and gen swallows them and returns null instead.
*/
@Service()
export default class EveQueryService {

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
  ) {
    const response = await this.esi.request(
      `/characters/${characterId}/industry/jobs/`,
      undefined,
      undefined,
      { token },
    );
    return await response.json();
  }

  public async genIndustryJobs(
    token: Token,
    characterId: number,
  ) {
    return await this.genxIndustryJobs(token, characterId).catch(() => null);
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
  ) {
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
  ) {
    return await this.genxStructure(token, structureId).catch(() => null);
  }

  /*
    Station object example
    {
      "max_dockable_ship_volume": 50000000,
      "name": "Muvolailen X - Moon 3 - CBD Corporation Storage",
      "office_rental_cost": 16961473,
      "owner": 1000002,
      "position": {
        "x": 1723680890880,
        "y": 256414064640,
        "z": -60755435520
      },
      "race_id": 1,
      "reprocessing_efficiency": 0.5,
      "reprocessing_stations_take": 0.05,
      "services": [
        "courier-missions",
        "reprocessing-plant",
        "market",
        "repair-facilities",
        "fitting",
        "news",
        "storage",
        "insurance",
        "docking",
        "office-rental",
        "loyalty-point-store",
        "navy-offices"
      ],
      "station_id": 60000004,
      "system_id": 30002780,
      "type_id": 1531
    }
  */
  public async genxStation(
    token: Token,
    stationId: number,
  ) {
    const response = await this.esi.request(
      `/universe/stations/${stationId}/`,
      undefined,
      undefined,
      { token },
    );
    return await response.json();
  }

  public async genStation(
    token: Token,
    stationId: number,
  ) {
    return await this.genxStation(token, stationId).catch(() => null);
  }

  /*
    @param page
      We can't query all assets a once, we need to query the specific
      page of results. 
      
    So this function itself is not that useful. Check below for genAllAssets
    
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
  */
  private async genxAssetsLimited(
    token: Token,
    characterId: number,
    page: number = 1,
  ) {
    const response = await this.esi.request(
      `/characters/${characterId}/assets/`,
      { page },
      undefined,
      { token },
    );
    return await response.json();
  }

  private async genAssetsLimited(
    token: Token,
    characterId: number,
    page: number = 1,
  ) {
    return await this.genxAssetsLimited(token, characterId, page)
      .catch(() => null);
  }

  /* 
    Similar to genxAssets and genAssets, but instead it will look for multiple
    pages (page count is hardcoded for now) and combine all the results.
    This function does multiple requests.
  */
  public async genAllAssets(
    token: Token,
    characterId: number,
  ) {
    const pageCount = 5;
    const allAssets = await Promise.all(
      [...Array(pageCount).keys()].map(
        async page => this.genAssetsLimited(token, characterId, page + 1)
      ),
    );
    return allAssets.filter(arr => arr !== null).flat();
  }

  /*
    @param itemIds 
      IDs of the items returned by the genAssets functions. It can contain
      at most 1000 elements. 
      
    This function on its own is not that useful (hence the private visibility).
    Check below for genAssetNames
    
    Asset names example object
    [
      { item_id: 360052160, name: 'I do shit' },
      { item_id: 945371609, name: '[B] Originals' },
      { item_id: 962104165, name: '[B] Copies' },
      { item_id: 1086967686, name: "Daki Razarac's Zephyr" },
      { item_id: 1702215246, name: 'Pac-Man' },
    ]
  */
  private async genxAssetNamesLimited(
    token: Token,
    characterId: number,
    itemIds: number[],  // max 1000 elements
  ) {
    const response = await this.esi.request(
      `/characters/${characterId}/assets/names/`,
      undefined,
      itemIds,
      { token, method: 'POST' }
    );
    return await response.json();
  }

  private async genAssetNamesLimited(
    token: Token,
    characterId: number,
    itemIds: number[],  // max 1000 elements
  ) {
    return await this.genxAssetNamesLimited(token, characterId, itemIds)
      .catch(() => null);
  }

  /*
    Similer to genAssetNamesLimited, but it will instead do multiple
    requests to query all assets.
  */
  public async genAssetNames(
    token: Token,
    characterId: number,
    itemIds: number[],  // unlimited element count
  ) {
    const chunkSize = 1000;
    const uniqueItemIds = [...new Set(itemIds)];

    let chunks = [];
    for (let i = 0; i < uniqueItemIds.length; i += chunkSize) {
      const chunk = uniqueItemIds.slice(i, i + chunkSize);
      chunks.push(chunk);
    }

    const responses = await Promise.all(chunks.map(async (chunk) =>
      this.genAssetNamesLimited(token, characterId, chunk),
    ));
    return responses.flat();
  }

  /*
    @param itemIds
      IDs of the items returned by the genAssets functions. It can contain
      at most 1000 elements. 
      
    This function on its own is not that useful (hence the private visibility).
    Check below for genAssetLocations
    
    Asset location object example
    [
      {
        item_id: 161392124,
        position: {
          x: -63041234638.04264,
          y: 63682433578.14636,
          z: -207071341017.4996
        }
      },
      { item_id: 166780952, position: { x: 0, y: 0, z: 0 } },
      { item_id: 166798913, position: { x: 0, y: 0, z: 0 } },
      { item_id: 166817336, position: { x: 0, y: 0, z: 0 } },
    ]
  */
  private async genxAssetLocationsLimited(
    token: Token,
    characterId: number,
    itemIds: number[],  // max 1000 elements
  ) {
    const response = await this.esi.request(
      `/characters/${characterId}/assets/locations/`,
      undefined,
      itemIds,
      { token, method: 'POST' }
    );
    return await response.json();
  }

  private async genAssetLocationsLimited(
    token: Token,
    characterId: number,
    itemIds: number[],  // max 1000 elements
  ) {
    return await this.genxAssetLocationsLimited(token, characterId, itemIds)
      .catch(() => null);
  }

  public async genAssetLocations(
    token: Token,
    characterId: number,
    itemIds: number[],  // any number of elements
  ) {
    const chunkSize = 1000;
    const uniqueItemIds = [...new Set(itemIds)];

    let chunks = [];
    for (let i = 0; i < uniqueItemIds.length; i += chunkSize) {
      const chunk = uniqueItemIds.slice(i, i + chunkSize);
      chunks.push(chunk);
    }

    const responses = await Promise.all(chunks.map(async (chunk) =>
      this.genAssetLocationsLimited(token, characterId, chunk),
    ));
    return responses.flat();
  }
}