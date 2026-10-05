import { Request, Response } from 'express';
import { Service } from 'typedi';
import ActorContext from '../../core/actor_context/ActorContext';
import Controller from '../../core/controller/Controller';
import MarketabilityService from './MarketabilityService';

@Service()
export default class MarketabilityController extends Controller {
  constructor(
    private readonly marketabilityService: MarketabilityService,
  ) {
    super();
  }

  protected initController(): void {
    /** Fetches data for item marketability. */
    this.appGet(
      '/marketability',
      async (_req: Request, res: Response, _actorContext: ActorContext) => {
        const output = await this.marketabilityService.genMarketableItemsForPage();
        res.json(output);
      },
    );
  }
}
