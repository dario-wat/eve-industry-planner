import { Request, Response, Router } from 'express';
import Container from 'typedi';
import PlannedProductService from '../services/PlannedProductService';
import GlobalMemory from '../lib/GlobalMemory_DO_NOT_USE';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  const plannedProductService = Container.get(PlannedProductService);

  // TODO(EIP-2) this is a temporary solution
  // until I get a database running
  const getCharacterId = () => GlobalMemory.characterId as number;

  app.get(
    '/planned_products',
    async (req: Request, res: Response) => {
      const characterId = getCharacterId();
      const products =
        await plannedProductService.genPlannedProducts(characterId);
      res.json(JSON.stringify(products));
    },
  );

  app.post(
    '/planned_products_recreate',
    async (req: Request, res: Response) => {
      console.log(req.body);
      await plannedProductService.genParseAndRecreate(req.body);
      // TODO return results
    },
  );
};

export default controller;