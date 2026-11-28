import { Service } from 'typedi';
import ActorContext from '../actor_context/ActorContext';
import StationService from './StationService';
import EveSdeData from '../sde/EveSdeData';
import { STRUCTURE_NICKNAMES } from '../../const/IDs';
import { shortLocationName } from './locationNames';

@Service()
export default class LocationNameService {

  constructor(
    private readonly stationService: StationService,
    private readonly sdeData: EveSdeData,
  ) { }

  /** Station names barely ever change, so they are kept for the life of the server. */
  private readonly names = new Map<number, string>();

  /** Short names ("Jita 4-4", "Perimeter TTT") for the locations ESI could name. */
  public async genShortNames(
    actorContext: ActorContext,
    locationIds: number[],
  ): Promise<Record<number, string>> {
    const unknown = [...new Set(locationIds)].filter((id) => !this.names.has(id));
    if (unknown.length > 0) {
      const names = await this.stationService.genAllStationNames(actorContext, unknown);
      for (const id of unknown) {
        const name = names[id];
        if (name) {
          const isNpcStation = this.sdeData.stations[id] !== undefined;
          this.names.set(id, shortLocationName(name, isNpcStation, STRUCTURE_NICKNAMES[id]));
        }
      }
    }
    return Object.fromEntries(locationIds
      .filter((id) => this.names.has(id))
      .map((id) => [id, this.names.get(id)!]));
  }
}
