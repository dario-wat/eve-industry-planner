import { Request, Response, Router } from 'express';
import Container from 'typedi';
import GlobalMemory from '../lib/GlobalMemory_DO_NOT_USE';
import MaterialStationService from '../services/product/MaterialStationService';
import EsiSequelizeProvider from '../services/foundation/EsiSequelizeProvider';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  // TODO(EIP-2) this is a temporary solution
  // until I get a database running
  const getCharacterId = () => GlobalMemory.characterId as number;
  const materialStationService = Container.get(MaterialStationService);

  app.get(
    '/material_stations',
    async (req: Request, res: Response) => {
      const characterId = getCharacterId();
      const stations = await materialStationService.genQuery(characterId);
      res.json(stations);
    },
  );

  app.post(
    '/material_stations_update',
    async (req: Request, res: Response) => {
      const characterId = getCharacterId();
      const products = await materialStationService.genUpdate(
        characterId,
        req.body.stations.map((s: any) => s.station_id),
      );
      res.json(products);
    },
  );
};

export default controller;