import { Token } from 'eve-esi-client';
import Container from 'typedi';
import EsiProviderService from '../services/EsiProviderService';

/*
* Each function comes in two forms: genx throws errors
* and gen swallows them and returns null instead.
*/
export namespace EveQuery {

  const esi = Container.get(EsiProviderService).get();

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
  export async function genxIndustryJobs(
    token: Token,
    characterId: number,
  ) {
    return await esi.request(
      `/characters/${characterId}/industry/jobs/`,
      undefined,
      undefined,
      { token },
    );
  }

  export async function genIndustryJobs(
    token: Token,
    characterId: number,
  ) {
    return await genxIndustryJobs(token, characterId).catch(() => null);
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
  export async function genxStructure(
    token: Token,
    structureId: number,
  ) {
    return await esi.request(
      `/universe/structures/${structureId}/`,
      undefined,
      undefined,
      { token },
    );
  }

  export async function genStructure(
    token: Token,
    structureId: number,
  ) {
    return await genxStructure(token, structureId).catch(() => null);
  }

  /*
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
  export async function genxAssets(
    token: Token,
    characterId: number,
  ) {
    return await esi.request(
      `/characters/${characterId}/assets/`,
      undefined,
      undefined,
      { token },
    );
  }

  export async function genAssets(
    token: Token,
    characterId: number,
  ) {
    return await genxAssets(token, characterId).catch(() => null);
  }
}