import { Service } from 'typedi';
import EsiTokenlessQueryService from './EsiTokenlessQueryService';
import EveSdeData from '../../core/sde/EveSdeData';
import { EsiCharacter } from '../../core/esi/models/EsiCharacter';
import { uniq, zip } from 'underscore';
import ActorContext from '../../core/actor_context/ActorContext';
import { combineMapsWithNulls } from '../../lib/util';
import { EveStructure } from 'types/EsiQuery';
import { EsiCacheItem, genQueryEsiCache } from '../../core/esi_cache/EsiCacheAction';
import { hoursToSeconds } from 'date-fns';
import EveQueryService from './EveQueryService';

export type StationData = {
  stationId: number;
  name: string;
  regionId: number;
};

@Service()
export default class StationService {
  constructor(
    private readonly esiQuery: EsiTokenlessQueryService,
    private readonly eveQuery: EveQueryService,
    private readonly sdeData: EveSdeData
  ) {}

  /**
   * Tries to fetch the station name by any means.
   * 1. Check SDE stations
   * 2. Check ESI Cache
   * 3. Call into ESI for structure data
   */
  public async genStationName(character: EsiCharacter, stationId: number): Promise<string | null> {
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
    stationIds: number[]
  ): Promise<Record<number, string | null>> {
    const uniqueStationIds = uniq(stationIds);
    const stationNames = await Promise.all(
      uniqueStationIds.map((stationId) => this.genStationName(character, stationId))
    );
    return Object.fromEntries(zip(uniqueStationIds, stationNames));
  }

  /** Fetches the names for a list of stations IDs given ActorContext. */
  public async genAllStationNames(
    actorContext: ActorContext,
    stationIds: number[]
  ): Promise<Record<number, string | null>> {
    const characters = await actorContext.genLoggedInLinkedCharacters();
    const stationNamesList = await Promise.all(
      characters.map(
        async (character) => await this.genAllStationNamesForCharacter(character, stationIds)
      )
    );

    return combineMapsWithNulls(stationNamesList);
  }

  /**
   * Fetches the structure from all characters in the ActorContext.
   * This is the best effort to get the structure data.
   */
  public async genStructureBestEffort(
    actorContext: ActorContext,
    stationId: number
  ): Promise<EveStructure | null> {
    const characters = await actorContext.genLoggedInLinkedCharacters();
    const results = await Promise.all(
      characters.map((character) => this.genStructureCached(character, stationId))
    );
    return results.find((structure) => structure !== null) ?? null;
  }

  /**
   * Gets the region in which the station is located. The station can be
   * either NPC or player owned structure. Returns null if the structure
   * cannot be accessed.
   * Also returns the station name and ID.
   */
  public async genStationData(
    actorContext: ActorContext,
    stationId: number
  ): Promise<StationData | null> {
    const stationData = this.sdeData.stations[stationId];
    if (stationData !== undefined) {
      return { stationId, name: stationData.name, regionId: stationData.region_id };
    }
    const main = await actorContext.genxMainCharacter();
    const structure = await this.genStructureBestEffort(actorContext, stationId);
    if (structure === null) {
      return null;
    }
    const regionId = await this.eveQuery.genxRegionIdFromSystemId(main, structure.solar_system_id);
    return { stationId, name: structure.name, regionId };
  }

  /** Cached version of genStructure */
  private async genStructureCached(
    character: EsiCharacter,
    stationId: number
  ): Promise<EveStructure | null> {
    return await genQueryEsiCache(
      stationId.toString(),
      EsiCacheItem.STRUCTURE,
      hoursToSeconds(24),
      async () => await this.esiQuery.genStructure(character.characterId, stationId)
    );
  }
}
