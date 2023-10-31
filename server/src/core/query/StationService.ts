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

@Service()
export default class StationService {

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
}