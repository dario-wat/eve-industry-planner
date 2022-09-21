import { Request, Response, Router } from 'express';
import Container from 'typedi';
import MaterialStationService from '../services/product/MaterialStationService';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  const materialStationService = Container.get(MaterialStationService);

  app.get(
    '/material_stations',
    async (req: Request, res: Response) => {
      const characterId = req.session.characterId!;
      const stations = await materialStationService.genQuery(characterId);
      res.json(stations);
    },
  );

  app.post(
    '/material_stations_update',
    async (req: Request, res: Response) => {
      const characterId = req.session.characterId!;
      const products = await materialStationService.genUpdate(
        characterId,
        req.body.stations.map((s: any) => s.station_id),
      );
      res.json(products);
    },
  );
};

export default controller;