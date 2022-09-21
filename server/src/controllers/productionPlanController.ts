import { Request, Response, Router } from 'express';
import Container from 'typedi';
import GlobalMemory from '../lib/GlobalMemory_DO_NOT_USE';
import ProductionPlanService from '../services/product/ProductionPlanService';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  // TODO(EIP-2) this is a temporary solution
  // until I get a database running
  const getCharacterId = () => GlobalMemory.characterId as number;
  const productionPlanService = Container.get(ProductionPlanService);

  app.get(
    '/planned_products_material_tree',
    async (req: Request, res: Response) => {
      const characterId = getCharacterId();
      const materialTree = await productionPlanService.genMaterialTree(
        characterId,
      );
      res.json(materialTree);
    },
  )
};

export default controller;