import { Request, Response } from 'express';
import { Service } from 'typedi';
import AssetsService from './AssetsService';
import ContractsService from './ContractsService';
import MarketService from './MarketService';
import Controller from '../../core/controller/Controller';
import ActorContext from '../../core/actor_context/ActorContext';

/** Contains endpoins for fetching data for various pages. */
@Service()
export default class EvePagesDataController extends Controller {

  constructor(
    private readonly assetsService: AssetsService,
    private readonly contractsService: ContractsService,
    private readonly marketService: MarketService,
  ) {
    super();
  }

  protected initController(): void {

    this.appGet(
      '/assets',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        const output = await this.assetsService.genDataForAssetPage(actorContext);
        res.json(output);
      },
    );

    this.appGet(
      '/assets_locations',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        const output = await this.assetsService.genAssetLocations(actorContext);
        res.json(output);
      },
    );

    this.appGet(
      '/contracts',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        const output = await this.contractsService.genDataForPage(actorContext);
        res.json(output);
      },
    );

    this.appGet(
      '/market_orders',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        const output = await this.marketService.genMarketOrdersForPage(
          actorContext,
        );
        res.json(output);
      },
    );
  }
}
