import { Service } from 'typedi';
import EsiQueryService from '../esi/EsiQueryService';
import EveSdeData from '../../core/sde/EveSdeData';
import { EsiCharacter } from '../../core/esi/models/EsiCharacter';
import { uniq, zip } from 'underscore';
import ActorContext from '../../core/actor_context/ActorContext';
import { combineMapsWithNulls } from '../../lib/util';
import { genNullOnEsiError } from '../../lib/eveUtil';

@Service()
export default class StationService {
  constructor(
    private readonly esiQuery: EsiQueryService,
    private readonly sdeData: EveSdeData
  ) {}

  /**
   * Fetches the station name.
   * 1. NPC stations (per SDE): ESI's station endpoint.
   * 2. Player structures: ESI's structure endpoint (ACL-gated).
   */
  public async genStationName(character: EsiCharacter, stationId: number): Promise<string | null> {
    const isNpcStation = this.sdeData.stations[stationId] !== undefined;
    if (isNpcStation) {
      const station = await genNullOnEsiError(() => this.esiQuery.genxStation(stationId));
      return station?.name ?? null;
    }

    const structure = await genNullOnEsiError(() =>
      this.esiQuery.genxStructure(character.characterId, stationId),
    );
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
}
