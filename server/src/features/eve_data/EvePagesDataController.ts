import { Request, Response } from 'express';
import { Container, Service } from 'typedi';
import IndustryJobService from './IndustryJobService';
import AssetsService from './AssetsService';
import ContractsService from './ContractsService';
import PortraitService from './PortraitService';
import MarketService from './MarketService';
import Controller from '../../core/controller/Controller';
import ActorContext from '../../core/actor_context/ActorContext';

@Service()
export default class EvePagesDataController extends Controller {

  constructor(
    private readonly industryJobService: IndustryJobService,
    private readonly assetsService: AssetsService,
    private readonly contractsService: ContractsService,
    private readonly marketService: MarketService,
  ) {
    super();
  }

  protected initController(): void {

    this.appGet(
      '/industry_jobs',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        const output = await this.industryJobService.genDataForPage(actorContext);
        res.json(output);
      },
    );

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

    // TODO do I need this ? should it fetch with character param
    this.appGet(
      '/portrait',
      async (req: Request, res: Response) => {
        const characterId = req.session.characterId!;
        const portraitService = Container.get(PortraitService);
        const output = await portraitService.genData(characterId);
        res.json(output);
      },
    );

    this.appGet(
      '/wallet_transactions',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        const output = await this.marketService.genWalletTransactionsForPage(
          actorContext,
        );
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
