import { Request, Response } from 'express';
import { Service } from 'typedi';
import ActorContext from '../../core/actor_context/ActorContext';
import Controller from '../../core/controller/Controller';
import MarketHistoryService from './MarketHistoryService';
import MarketHistorySummaryService from './MarketHistorySummaryService';

@Service()
export default class MarketHistoryController extends Controller {
  constructor(
    private readonly marketHistoryService: MarketHistoryService,
    private readonly marketHistorySummaryService: MarketHistorySummaryService,
  ) {
    super();
  }

  protected initController(): void {
    /** Stored 7/30/90-day summaries for every type in The Forge. */
    this.appGet(
      '/market_history/scan',
      async (_req: Request, res: Response, _actorContext: ActorContext) => {
        const output = await this.marketHistorySummaryService.genMarketHistoryScan();
        res.json(output);
      },
    );

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
