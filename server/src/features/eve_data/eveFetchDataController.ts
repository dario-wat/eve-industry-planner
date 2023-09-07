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

    // TODO do the rest

    this.appGet(
      '/assets',
      async (req: Request, res: Response) => {
        const characterId = req.session.characterId!;
        const assetService = Container.get(AssetsService);
        const output = await assetService.genDataForAssetPage(characterId);
        res.json(output);
      },
    );

    this.appGet(
      '/assets_locations',
      async (req: Request, res: Response) => {
        const characterId = req.session.characterId!;
        const assetService = Container.get(AssetsService);
        const output = await assetService.genAssetLocations(characterId);
        res.json(output);
      },
    );

    this.appGet(
      '/contracts',
      async (req: Request, res: Response) => {
        const characterId = req.session.characterId!;
        const contractsService = Container.get(ContractsService);
        const output = await contractsService.genData(characterId);
        res.json(output);
      },
    );

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
      async (req: Request, res: Response) => {
        const characterId = req.session.characterId!;
        const marketService = Container.get(MarketService);
        const output = await marketService.genWalletTransactions(characterId);
        res.json(output);
      },
    );

    this.appGet(
      '/market_orders',
      async (req: Request, res: Response) => {
        const characterId = req.session.characterId!;
        const marketService = Container.get(MarketService);
        const output = await marketService.genMarketOrders(characterId);
        res.json(output);
      },
    );
  }
}
