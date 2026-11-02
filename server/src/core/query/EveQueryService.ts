import { Service } from 'typedi';
import { chunk, uniq } from 'underscore';
import { mapify } from '../../lib/util';
import type { EsiAsset, EsiName } from 'eve-esi';
import { filterNullOrUndef } from '@internal/shared';
import { EsiCharacter } from '../../core/esi/models/EsiCharacter';
import EsiQueryService from '../esi/EsiQueryService';

/** More complex EVE queries built on top of the ESI query services. */
@Service()
export default class EveQueryService {
  constructor(private readonly esiQuery: EsiQueryService) {}

  /** Queries all assets for the given character. */
  public async genAllAssets(character: EsiCharacter): Promise<EsiAsset[]> {
    return await this.esiQuery.genxAllAssets(character.characterId);
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
