import { Router, Request, Response } from 'express';
import { Container } from 'typedi';
import IndustryJobService from './IndustryJobService';
import AssetsService from './AssetsService';
import ContractsService from './ContractsService';
import PortraitService from './PortraitService';
import MarketService from './MarketService';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  app.get(
    '/industry_jobs',
    async (req: Request, res: Response) => {
      const characterId = req.session.characterId!;
      const industryJobService = Container.get(IndustryJobService);
      const output = await industryJobService.genDataForPage(characterId);
      res.json(output);
    },
  );

  app.get(
    '/assets',
    async (req: Request, res: Response) => {
      const characterId = req.session.characterId!;
      const assetService = Container.get(AssetsService);
      const output = await assetService.genDataForAssetPage(characterId);
      res.json(output);
    },
  );

  app.get(
    '/assets_locations',
    async (req: Request, res: Response) => {
      const characterId = req.session.characterId!;
      const assetService = Container.get(AssetsService);
      const output = await assetService.genAssetLocations(characterId);
      res.json(output);
    },
  );

  app.get(
    '/contracts',
    async (req: Request, res: Response) => {
      const characterId = req.session.characterId!;
      const contractsService = Container.get(ContractsService);
      const output = await contractsService.genData(characterId);
      res.json(output);
    },
  );

  app.get(
    '/portrait',
    async (req: Request, res: Response) => {
      const characterId = req.session.characterId!;
      const portraitService = Container.get(PortraitService);
      const output = await portraitService.genData(characterId);
      res.json(output);
    },
  );

  app.get(
    '/wallet_transactions',
    async (req: Request, res: Response) => {
      const characterId = req.session.characterId!;
      const marketService = Container.get(MarketService);
      const output = await marketService.genWalletTransactions(characterId);
      res.json(output);
    },
  );

  app.get(
    '/market_orders',
    async (req: Request, res: Response) => {
      const characterId = req.session.characterId!;
      const marketService = Container.get(MarketService);
      const output = await marketService.genMarketOrders(characterId);
      res.json(output);
    },
  );
};

export default controller;