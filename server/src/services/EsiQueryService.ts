import ESI, { Token } from 'eve-esi-client';
import { Service } from 'typedi';
import { EveAsset, EveAssetName, EveIndustryJob, EveStation, EveStructure } from '../types/EsiQuery';
import EsiProviderService from './EsiProviderService';

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
  ): Promise<EveIndustryJob[]> {
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
  ): Promise<EveIndustryJob[] | null> {
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
  ): Promise<EveStation> {
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
  ): Promise<EveStation | null> {
    return await this.genxStation(token, stationId).catch(() => null);
  }

  /*
    @param page
      We can't query all assets a once, we need to query the specific
      page of results.   
    So this function itself is not that useful. Check out genAllAssets.
    
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
  public async genxAssets(
    token: Token,
    characterId: number,
    page: number = 1,
  ): Promise<EveAsset[]> {
    const response = await this.esi.request(
      `/characters/${characterId}/assets/`,
      { page },
      undefined,
      { token },
    );
    return await response.json();
  }

  public async genAssets(
    token: Token,
    characterId: number,
    page: number = 1,
  ): Promise<EveAsset[] | null> {
    return await this.genxAssets(token, characterId, page)
      .catch(() => null);
  }

  /*
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
      .catch(() => null);
  }
}