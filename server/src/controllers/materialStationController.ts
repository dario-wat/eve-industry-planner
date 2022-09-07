import { Request, Response, Router } from 'express';
import Container from 'typedi';
import GlobalMemory from '../lib/GlobalMemory_DO_NOT_USE';
import { requiredScopes } from '../lib/eve_sso/eveScopes';
import MaterialStationService from '../services/product/MaterialStationService';
import EveMemoryProviderService from '../services/foundation/EveMemoryProviderService';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  // TODO(EIP-2) this is a temporary solution
  // until I get a database running
  const getCharacterId = () => GlobalMemory.characterId as number;
  const provider = Container.get(EveMemoryProviderService).get();
  const materialStationService = Container.get(MaterialStationService);

  app.get(
    '/material_stations',
    async (req: Request, res: Response) => {
      const characterId = getCharacterId();
      // TODO required scopes should be abstracted
      const token = await provider.getToken(characterId, requiredScopes);
      const stations =
        await materialStationService.genQuery(token, characterId);
      res.json(stations);
    },
  );

  app.post(
    '/material_stations_update',
    async (req: Request, res: Response) => {
      const characterId = getCharacterId();
      const token = await provider.getToken(characterId, requiredScopes);
      const products = await materialStationService.genUpdate(
        token,
        characterId,
        req.body.stations.map((s: any) => s.station_id),
      );
      res.json(products);
    },
  );
};

export default controller;