import { Router, Request, Response } from 'express';
import { Container } from 'typedi';
import { requiredScopes } from '../const/EveScopes';
import EveMemoryProviderService from '../services/foundation/EveMemoryProviderService';
import GlobalMemory from '../lib/GlobalMemory_DO_NOT_USE';
import IndustryJobService from '../services/product/IndustryJobService';
import AssetsService from '../services/product/AssetsService';
import EsiQueryService from '../services/query/EsiQueryService';
import ContractsService from '../services/product/ContractsService';

const route = Router();

// TODO make this nicer, move all business logic out of this file
// TODO add types to responses
const controller = (app: Router) => {
  app.use('/', route);

  const provider = Container.get(EveMemoryProviderService).get();
  const esiQuery = Container.get(EsiQueryService);

  // TODO(EIP-2) this is a temporary solution
  // until I get a database running
  // TODO need to check if user is logged in every time
  const getCharacterId = () => GlobalMemory.characterId as number;

  app.get(
    '/industry_jobs',
    async (req: Request, res: Response) => {
      const characterId = getCharacterId();
      const token = await provider.getToken(characterId, requiredScopes);

      const industryJobService = Container.get(IndustryJobService);
      const output = await industryJobService.genData(characterId, token);
      res.json(output);
    },
  );

  app.get(
    '/assets',
    async (req: Request, res: Response) => {
      const characterId = getCharacterId();
      const token = await provider.getToken(characterId, requiredScopes);

      const assetService = Container.get(AssetsService);
      const output = await assetService.genData(characterId, token);
      res.json(output);
    },
  );

  app.get(
    '/contracts',
    async (req: Request, res: Response) => {
      const characterId = getCharacterId();
      const token = await provider.getToken(characterId, requiredScopes);

      const contractsService = Container.get(ContractsService);
      const output = await contractsService.genData(characterId, token);
      res.json(output);
    },
  );

  app.get(
    '/portrait',
    async (req: Request, res: Response) => {
      const characterId = getCharacterId();
      if (!characterId) {
        res.json(null);
        return;
      }

      const token = await provider.getToken(characterId, requiredScopes);
      const portrait = await esiQuery.genxPortrait(token, characterId);
      res.json({ px64x64: portrait.px64x64 });
    },
  );
};

export default controller;