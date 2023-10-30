import { Service } from 'typedi';
import { EsiCacheItem, genQueryEsiCache } from './EsiCacheAction';
import { hoursToSeconds } from 'date-fns';
import { EsiCharacter } from '../../core/esi/models/EsiCharacter';
import { EveAsset, EveStructure } from '../../types/EsiQuery';
import EsiTokenlessQueryService from '../../core/query/EsiTokenlessQueryService';
import EveQueryService from '../../core/query/EveQueryService';

/** Definitions of various cache use cases. */
@Service()
export default class EsiCacheDefService {

  constructor(
    private readonly esiQuery: EsiTokenlessQueryService,
    private readonly eveQuery: EveQueryService,
  ) { }

  /** Handles structures in cache. */
  public async genStructure(
    character: EsiCharacter,
    stationId: number,
  ): Promise<EveStructure | null> {
    return await genQueryEsiCache(
      stationId.toString(),
      EsiCacheItem.STRUCTURE,
      hoursToSeconds(24),
      async () => {
        const structure = await this.esiQuery.genStructure(
          character.characterId,
          stationId,
        );
        return structure;
      },
    );
  }

  /** Queries all assets for the given user and caches the result. */
  public async genAssets(character: EsiCharacter): Promise<EveAsset[] | null> {
    return await genQueryEsiCache(
      character.characterId.toString(),
      EsiCacheItem.ASSETS,
      hoursToSeconds(1),
      async () => await this.eveQuery.genAllAssets(character),
    )
  }
}