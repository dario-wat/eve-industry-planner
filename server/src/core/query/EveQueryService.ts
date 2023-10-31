import { Service } from 'typedi';
import { chunk, range, uniq } from 'underscore'
import { mapify } from '../../lib/util';
import { EveAsset, EveName } from '../../types/EsiQuery';
import { filterNullOrUndef } from '@internal/shared';
import EsiTokenlessQueryService from './EsiTokenlessQueryService';
import { EsiCharacter } from '../../core/esi/models/EsiCharacter';
import { EsiCacheItem, genQueryEsiCache } from '../../core/esi_cache/EsiCacheAction';
import { hoursToSeconds } from 'date-fns';

/** More complex EVE queries built on top of the ESI query services. */
@Service()
export default class EveQueryService {

  constructor(
    private readonly esiQuery: EsiTokenlessQueryService,
  ) { }

  /** Queries all assets for the given user and caches the result. */
  public async genAllAssets(
    character: EsiCharacter,
  ): Promise<EveAsset[] | null> {
    return await genQueryEsiCache(
      character.characterId.toString(),
      EsiCacheItem.ASSETS,
      hoursToSeconds(1),
      async () => await this.genAllAssetsInternal(character),
    );
  }

  // TODO this can throw exceptions
  /* 
    Similar to genxAssets and genAssets, but instead it will look for multiple
    pages (page count is hardcoded for now) and combine all the results.
    This function does multiple requests.
    Returns the same type as genAssets.
  */
  private async genAllAssetsInternal(character: EsiCharacter): Promise<EveAsset[]> {
    const pageCount = 5;
    const allAssets = await Promise.all(
      range(1, pageCount + 1).map(
        page => this.esiQuery.genAssets(character.characterId, page),
      ),
    );
    return filterNullOrUndef(allAssets).flat();
  }

  /**
   * Fetches names for a list of IDs. IDs can be of anything that has a name,
   * e.g. character, corporation, alliance ...
   */
  public async genAllNames(
    character: EsiCharacter,
    ids: number[],
  ): Promise<Record<number, EveName>> {
    const chunkSize = 1000;
    const uniqueIds = uniq(ids).filter(id => id !== 0);
    const chunks = chunk(uniqueIds, chunkSize);

    const responses = await Promise.all(chunks.map(
      ch => this.esiQuery.genxNames(character.characterId, ch),
    ));
    return mapify(filterNullOrUndef(responses.flat()), 'id');
  }
}