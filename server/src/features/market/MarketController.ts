import { Request, Response } from 'express';
import { Service } from 'typedi';
import MarketService from './MarketService';
import Controller from '../../core/controller/Controller';
import ActorContext from '../../core/actor_context/ActorContext';
import MarketabilityService from './MarketabilityService';

@Service()
export default class MarketController extends Controller {
  constructor(
    private readonly marketService: MarketService,
    private readonly marketabilityService: MarketabilityService
  ) {
    super();
  }

  protected initController(): void {
    /** Queries market orders for the logged in account. */
    this.appGet(
      '/market_orders',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        const output = await this.marketService.genMarketOrdersForAccount(actorContext);
        res.json(output);
      }
    );

    // TODO finish
    // this.appGet(
    //   '/market_orders_region',
    // );

    /** Fetches market history data for a single typeId. */
    this.appGet(
      '/market_history/:typeName',
      async (req: Request, res: Response, actorContext: ActorContext) => {
        const output = await this.marketService.genMarketHistory(actorContext, req.params.typeName);
        res.json(output);
      }
    );

    /** Fetches data for item marketability. */
    this.appGet(
      '/marketability',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        const output = await this.marketabilityService.genMarketableItemsForPage(actorContext);
        res.json(output);
      }
    );

    /** Returns prices for given set of stations and items. */
    this.appPost(
      '/market_comparison',
      async (req: Request, res: Response, actorContext: ActorContext) => {
        const output = await this.marketService.genMarketOrders(
          actorContext,
          req.body.stationIds,
          req.body.text
        );
        res.json(output);
      }
    );
  }
}
