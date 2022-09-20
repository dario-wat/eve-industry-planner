import { Router, Request, Response } from 'express';
import { Container } from 'typedi';
import GlobalMemory from '../lib/GlobalMemory_DO_NOT_USE';
import IndustryJobService from '../services/product/IndustryJobService';
import AssetsService from '../services/product/AssetsService';
import ContractsService from '../services/product/ContractsService';
import PortraitService from '../services/product/PortraitService';

const route = Router();

// TODO add types to responses
const controller = (app: Router) => {
  app.use('/', route);

  // TODO(EIP-2) this is a temporary solution
  // until I get a database running
  // TODO need to check if user is logged in every time
  const getCharacterId = () => GlobalMemory.characterId as number;

  app.get(
    '/industry_jobs',
    async (req: Request, res: Response) => {
      const characterId = getCharacterId();
      const industryJobService = Container.get(IndustryJobService);
      const output = await industryJobService.genData(characterId);
      res.json(output);
    },
  );

  app.get(
    '/assets',
    async (req: Request, res: Response) => {
      const characterId = getCharacterId();
      const assetService = Container.get(AssetsService);
      const output = await assetService.genData(characterId);
      res.json(output);
    },
  );

  app.get(
    '/contracts',
    async (req: Request, res: Response) => {
      const characterId = getCharacterId();
      const contractsService = Container.get(ContractsService);
      const output = await contractsService.genData(characterId);
      res.json(output);
    },
  );

  app.get(
    '/portrait',
    async (req: Request, res: Response) => {
      const characterId = getCharacterId();
      // TODO this should be handled better once I have sessions
      // in general figure out how to handle non logged in users
      if (!characterId) {
        res.json(null);
        return;
      }

      const portraitService = Container.get(PortraitService);
      const output = await portraitService.genData(characterId);
      res.json(output);
    },
  );
};

export default controller;