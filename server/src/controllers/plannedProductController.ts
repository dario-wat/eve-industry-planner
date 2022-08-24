import { Request, Router } from 'express';
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
      const products = await plannedProductService.genPlannedProducts(characterId);

      // const industryJobs = await esiQuery.genxIndustryJobs(token, characterId);

      // const industryJobService = Container.get(IndustryJobService);
      // const output = await industryJobService.getData(token, industryJobs);
      res.json({});
    },
  );
};

export default controller;