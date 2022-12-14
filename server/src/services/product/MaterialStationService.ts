import { Service } from 'typedi';
import { MaterialStationsRes } from '@internal/shared';
import { MaterialStation } from '../../models/MaterialStation';
import EveQueryService from '../query/EveQueryService';

@Service()
export default class MaterialStationUtil {

  constructor(
    private readonly eveQuery: EveQueryService,
  ) { }

  public async genQuery(
    characterId: number,
  ): Promise<MaterialStationsRes> {
    const materialStations = await MaterialStation.findAll({
      attributes: ['station_id'],
      where: {
        character_id: characterId,
      },
    });
    return await this.genStationsForResponse(characterId, materialStations);
  }

  public async genUpdate(
    characterId: number,
    stationIds: number[],
  ): Promise<MaterialStationsRes> {
    // Delete current data
    await MaterialStation.destroy({
      where: {
        character_id: characterId,
      },
    });

    // Recreate new data
    const result = await MaterialStation.bulkCreate(
      stationIds.map(sid => ({ character_id: characterId, station_id: sid })),
    );
    return await this.genStationsForResponse(characterId, result);
  }

  /*
  * Helper function to format Stations for response.
  */
  private async genStationsForResponse(
    characterId: number,
    materialStations: MaterialStation[],
  ): Promise<MaterialStationsRes> {
    const stations = await this.eveQuery.genAllStationNames(
      characterId,
      materialStations.map(station => station.get().station_id),
    );
    return Object.entries(stations).map(station => ({
      station_name: station[1],
      station_id: Number(station[0]),
    }));
  }
}