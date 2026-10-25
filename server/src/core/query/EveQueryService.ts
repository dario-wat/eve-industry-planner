import { Service } from 'typedi';
import { chunk, uniq } from 'underscore';
import { mapify } from '../../lib/util';
import type { EsiAsset, EsiName } from 'eve-esi';
import { filterNullOrUndef } from '@internal/shared';
import { EsiCharacter } from '../../core/esi/models/EsiCharacter';
import { EsiCacheItem, genQueryEsiCache } from '../../core/esi_cache/EsiCacheAction';
import { hoursToSeconds } from 'date-fns';
import EsiQueryService from '../esi/EsiQueryService';

/** More complex EVE queries built on top of the ESI query services. */
@Service()
export default class EveQueryService {
  constructor(private readonly esiQuery: EsiQueryService) {}

  // TODO Do I still need to cache this now that multipage is fixed
  /** Queries all assets for the given user and caches the result. */
  public async genAllAssets(character: EsiCharacter): Promise<EsiAsset[] | null> {
    return await genQueryEsiCache(
      character.characterId.toString(),
      EsiCacheItem.ASSETS,
      hoursToSeconds(1),
      async () => await this.esiQuery.genxAllAssets(character.characterId)
    );
  }

  /**
   * Fetches names for a list of IDs. IDs can be of anything that has a name,
   * e.g. character, corporation, alliance ...
   */
  public async genAllNames(
    ids: number[]
  ): Promise<Record<number, EsiName>> {
    const chunkSize = 1000;
    const uniqueIds = uniq(ids).filter((id) => id !== 0);
    const chunks = chunk(uniqueIds, chunkSize);

    const responses = await Promise.all(
      chunks.map((ch) => this.esiQuery.genxNames(ch))
    );
    return mapify(filterNullOrUndef(responses.flat()), 'id');
  }
}
