import { Request, Response } from 'express';
import { Service } from 'typedi';
import ProductionPlanService from './ProductionPlanService';
import Controller from '../../core/controller/Controller';
import ActorContext from '../../core/actor_context/ActorContext';

@Service()
export default class ProductionPlanController extends Controller {

  constructor(
    private readonly productionPlanService: ProductionPlanService,
  ) {
    super();
  }

  protected initController(): void {
    /**
     * Calculates a production plan for the given planned product group, if
     * any is selected. Otherwise it computes for all planned products.
     * Production plan consists of many things including blueprint runs,
     * required materials, ...
     */
    this.appGet(
      '/production_plan/:group?',
      async (req: Request, res: Response, actorContext: ActorContext) => {
        const productionPlan = await this.productionPlanService.genProductionPlan(
          actorContext,
          req.params.group,
        );
        res.json(productionPlan);
      },
    );
  }
}
