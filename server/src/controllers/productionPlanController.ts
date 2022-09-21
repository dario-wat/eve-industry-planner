import { Request, Response, Router } from 'express';
import Container from 'typedi';
import ProductionPlanService from '../services/product/ProductionPlanService';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  const productionPlanService = Container.get(ProductionPlanService);

  app.get(
    '/planned_products_material_tree',
    async (req: Request, res: Response) => {
      const characterId = req.session.characterId!;
      const materialTree = await productionPlanService.genMaterialTree(
        characterId,
      );
      res.json(materialTree);
    },
  )
};

export default controller;