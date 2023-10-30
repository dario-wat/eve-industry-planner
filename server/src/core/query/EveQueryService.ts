import { Service } from 'typedi';
import { chunk, range, uniq, zip } from 'underscore'
import { combineMapsWithNulls, mapify } from '../../lib/util';
import { EveAsset, EveName, EveStructure } from '../../types/EsiQuery';
import EveSdeData from '../sde/EveSdeData';
import { filterNullOrUndef } from '@internal/shared';
import EsiTokenlessQueryService from './EsiTokenlessQueryService';
import { EsiCharacter } from '../../core/esi/models/EsiCharacter';
import ActorContext from '../../core/actor_context/ActorContext';
import { EsiCacheItem, genQueryEsiCache } from '../../core/esi_cache/EsiCacheAction';
import { hoursToSeconds } from 'date-fns';

/** More complex EVE queries built on top of the ESI query services. */
@Service()
export default class EveQueryService {

  constructor(
    private readonly esiQuery: EsiTokenlessQueryService,
    private readonly sdeData: EveSdeData,
  ) { }

  /**
   * Tries to fetch the station name by any means.
   * 1. Check SDE stations
   * 2. Check ESI Cache
   * 3. Call into ESI for structure data
   */
  public async genStationName(
    character: EsiCharacter,
    stationId: number,
  ): Promise<string | null> {
    const sdeStation = this.sdeData.stations[stationId];
    if (sdeStation) {
      return sdeStation.name;
    }

    const structure = await this.genStructureCached(character, stationId);
    return structure?.name ?? null;
  }

  /** 
   * Fetches the names for a list of station IDs.
   * The result is a map where key is the station ID and the value
   * is the station name or null if the name cannot be fetched (e.g. if the
   * character has no ACL access to the station).
   */
  public async genAllStationNamesForCharacter(
    character: EsiCharacter,
    stationIds: number[],
  ): Promise<Record<number, string | null>> {
    const uniqueStationIds = uniq(stationIds);
    const stationNames = await Promise.all(uniqueStationIds.map(
      stationId => this.genStationName(character, stationId),
    ));
    return Object.fromEntries(zip(uniqueStationIds, stationNames));
  }

  /** Fetches the names for a list of stations IDs given ActorContext. */
  public async genAllStationNames(
    actorContext: ActorContext,
    stationIds: number[],
  ): Promise<Record<number, string | null>> {
    const characters = await actorContext.genLinkedCharacters();
    const stationNamesList = await Promise.all(characters.map(async character =>
      await this.genAllStationNamesForCharacter(character, stationIds),
    ));

    return combineMapsWithNulls(stationNamesList);
  }

  /** Cached version of genStructure */
  private async genStructureCached(
    character: EsiCharacter,
    stationId: number,
  ): Promise<EveStructure | null> {
    return await genQueryEsiCache(
      stationId.toString(),
      EsiCacheItem.STRUCTURE,
      hoursToSeconds(24),
      async () => await this.esiQuery.genStructure(
        character.characterId,
        stationId,
      ),
    );
  }

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