import { Token } from 'eve-esi-client';
import Container from 'typedi';
import EsiProviderService from '../services/EsiProviderService';

/*
* Each function comes in two forms: genx throws errors
* and gen swallows them and returns null instead.
*/
export namespace EveQuery {

  const esi = Container.get(EsiProviderService).get();

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