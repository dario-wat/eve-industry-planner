import { Service } from 'typedi';
import { chunk, uniq } from 'underscore';
import { mapify } from '../../lib/util';
import { EveAsset, EveName } from '../../types/EsiQuery';
import { filterNullOrUndef } from '@internal/shared';
import EsiTokenlessQueryService from './EsiTokenlessQueryService';
import { EsiCharacter } from '../../core/esi/models/EsiCharacter';
import { EsiCacheItem, genQueryEsiCache } from '../../core/esi_cache/EsiCacheAction';
import { hoursToSeconds } from 'date-fns';
import EsiMultiPageQueryService from './EsiMultiPageQueryService';

/** More complex EVE queries built on top of the ESI query services. */
@Service()
export default class EveQueryService {
  constructor(
    private readonly esiQuery: EsiTokenlessQueryService,
    private readonly esiMultiPageQuery: EsiMultiPageQueryService
  ) {}

  // TODO Do I still need to cache this now that multipage is fixed
  /** Queries all assets for the given user and caches the result. */
  public async genAllAssets(character: EsiCharacter): Promise<EveAsset[] | null> {
    return await genQueryEsiCache(
      character.characterId.toString(),
      EsiCacheItem.ASSETS,
      hoursToSeconds(1),
      async () => await this.esiMultiPageQuery.genxAllAssets(character)
    );
  }

  /**
   * Fetches names for a list of IDs. IDs can be of anything that has a name,
   * e.g. character, corporation, alliance ...
   */
  public async genAllNames(
    character: EsiCharacter,
    ids: number[]
  ): Promise<Record<number, EveName>> {
    const chunkSize = 1000;
    const uniqueIds = uniq(ids).filter((id) => id !== 0);
    const chunks = chunk(uniqueIds, chunkSize);

    const responses = await Promise.all(
      chunks.map((ch) => this.esiQuery.genxNames(character.characterId, ch))
    );
    return mapify(filterNullOrUndef(responses.flat()), 'id');
  }

  /**
   * Fetches region ID from system ID by
   * solar system -> constellation -> region.
   */
  public async genxRegionIdFromSystemId(
    character: EsiCharacter,
    systemId: number
  ): Promise<number> {
    const solarSystem = await this.esiQuery.genxSolarSystem(character.characterId, systemId);
    const constellation = await this.esiQuery.genxConstellation(
      character.characterId,
      solarSystem.constellation_id
    );
    return constellation.region_id;
  }
}
