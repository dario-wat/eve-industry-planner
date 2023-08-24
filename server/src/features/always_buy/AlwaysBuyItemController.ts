import { Request, Response } from 'express';
import { Service } from 'typedi';
import AlwaysBuyItemService from './AlwaysBuyItemService';
import Controller from '../../core/controller/Controller';
import ActorContext from '../../core/actor_context/ActorContext';

@Service()
export default class AlwaysBuyItemController extends Controller {

  constructor(
    private readonly alwaysBuyItemService: AlwaysBuyItemService,
  ) {
    super();
  }

  protected initController(): void {
    this.appGet(
      '/always_buy_items',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        const items = await this.alwaysBuyItemService.genQuery(actorContext);
        res.json(items);
      },
    );

    this.appPost(
      '/always_buy_items_update',
      async (req: Request, res: Response, actorContext: ActorContext) => {
        const items = await this.alwaysBuyItemService.genUpdate(
          actorContext,
          req.body.typeIds,
        );
        res.json(items);
      },
    );
  }
}