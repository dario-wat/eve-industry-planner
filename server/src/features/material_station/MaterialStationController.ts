import { Request, Response } from 'express';
import { Service } from 'typedi';
import MaterialStationService from './MaterialStationService';
import Controller from '../../core/controller/Controller';
import ActorContext from '../../core/actor_context/ActorContext';
import { MaterialStationsRes } from '@internal/shared';

@Service()
export default class MaterialStationController extends Controller {

  constructor(
    private readonly materialStationService: MaterialStationService,
  ) {
    super();
  }

  protected initController(): void {
    this.appGet(
      '/material_stations',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        const stations = await this.materialStationService.genQuery(actorContext);
        res.json(stations);
      },
    );

    this.appPost(
      '/material_stations_update',
      async (req: Request, res: Response, actorContext: ActorContext) => {
        const stations = await this.materialStationService.genUpdate(
          actorContext,
          req.body.stations.map((s: MaterialStationsRes[number]) => s.station_id),
        );
        res.json(stations);
      },
    );
  }
}
