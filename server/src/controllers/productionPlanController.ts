import { Request, Response, Router } from 'express';
import Container from 'typedi';
import ProductionPlanService from '../services/product/production_plan/ProductionPlanService';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  const productionPlanService = Container.get(ProductionPlanService);

  app.get(
    '/production_plan/:group?',
    async (req: Request, res: Response) => {
      const characterId = req.session.characterId!;
      const productionPlan = await productionPlanService.genProductionPlan(
        characterId,
        req.params.group,
      );
      res.json(productionPlan);
    },
  );
};

export default controller;