import { Service } from 'typedi';
import { MaterialStationsRes } from '@internal/shared';
import { MaterialStation } from './MaterialStation';
import EveQueryService from '../../core/query/EveQueryService';
import ActorContext from '../../core/actor_context/ActorContext';

@Service()
export default class MaterialStationUtil {

  constructor(
    private readonly eveQuery: EveQueryService,
  ) { }

  /** Queries all material stations related to logged in account. */
  public async genQuery(
    actorContext: ActorContext,
  ): Promise<MaterialStationsRes> {
    const account = await actorContext.genxAccount();
    const materialStations = await account.getMaterialStations();
    return await this.genStationsForResponse(
      actorContext,
      materialStations,
    );
  }

  /** Updates the list of material stations. */
  public async genUpdate(
    actorContext: ActorContext,
    stationIds: number[],
  ): Promise<MaterialStationsRes> {
    const account = await actorContext.genxAccount();

    // Delete current data
    await MaterialStation.destroy({
      where: {
        accountId: account.id,
      },
    });

    // Recreate new data
    const result = await MaterialStation.bulkCreate(
      stationIds.map(sid => ({ accountId: account.id, station_id: sid })),
    );
    return await this.genStationsForResponse(actorContext, result);
  }

  /*
  * Helper function to format Stations for response.
  */
  private async genStationsForResponse(
    actorContext: ActorContext,
    materialStations: MaterialStation[],
  ): Promise<MaterialStationsRes> {
    const character = await actorContext.genxMainCharacter();
    const stations = await this.eveQuery.genAllStationNames(
      character.characterId,
      materialStations.map(station => station.get().station_id),
    );
    return Object.entries(stations).map(station => ({
      station_name: station[1],
      station_id: Number(station[0]),
    }));
  }
}