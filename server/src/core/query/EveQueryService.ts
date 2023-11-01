import { Service } from 'typedi';
import { chunk, uniq } from 'underscore'
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
    private readonly esiMultiPageQuery: EsiMultiPageQueryService,
  ) { }

  /** Queries all assets for the given user and caches the result. */
  public async genAllAssets(
    character: EsiCharacter,
  ): Promise<EveAsset[] | null> {
    return await genQueryEsiCache(
      character.characterId.toString(),
      EsiCacheItem.ASSETS,
      hoursToSeconds(1),
      async () => await this.esiMultiPageQuery.genAllAssets(character),
    );
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