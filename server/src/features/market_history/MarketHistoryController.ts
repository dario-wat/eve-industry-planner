import { Request, Response } from 'express';
import { Service } from 'typedi';
import ActorContext from '../../core/actor_context/ActorContext';
import Controller from '../../core/controller/Controller';
import MarketHistoryService from './MarketHistoryService';

@Service()
export default class MarketHistoryController extends Controller {
  constructor(
    private readonly marketHistoryService: MarketHistoryService,
  ) {
    super();
  }

  protected initController(): void {
    /** Fetches market history data for a single type id. */
    this.appGet(
      '/market_history/:typeId',
      async (req: Request, res: Response, _actorContext: ActorContext) => {
        const output = await this.marketHistoryService.genMarketHistory(
          Number(req.params.typeId),
        );
        res.json(output);
      },
    );
  }
}
