import { Router, Request, Response } from 'express';
import { Container } from 'typedi';
import { hoursToSeconds } from 'date-fns';
import { requiredScopes } from '../const/EveScopes';
import EveMemoryProviderService from '../services/foundation/EveMemoryProviderService';
import GlobalMemory from '../lib/GlobalMemory_DO_NOT_USE';
import IndustryJobService from '../services/product/IndustryJobService';
import AssetsService from '../services/product/AssetsService';
import EsiQueryService from '../services/query/EsiQueryService';
import ContractsService from '../services/product/ContractsService';
import { EsiCacheItem, EsiCacheUtil } from '../services/foundation/EsiCacheUtil';
import EveQueryService from '../services/query/EveQueryService';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  const provider = Container.get(EveMemoryProviderService).get();
  const esiQuery = Container.get(EsiQueryService);
  const eveQuery = Container.get(EveQueryService);

  // TODO(EIP-2) this is a temporary solution
  // until I get a database running
  // TODO need to check if user is logged in every time
  const getCharacterId = () => GlobalMemory.characterId as number;

  app.get(
    '/industry_jobs',
    async (req: Request, res: Response) => {
      const characterId = getCharacterId();
      const token = await provider.getToken(characterId, requiredScopes);
      const industryJobs = await esiQuery.genxIndustryJobs(token, characterId);

      const industryJobService = Container.get(IndustryJobService);
      const output = await industryJobService.getData(token, industryJobs);
      res.json(output);
    },
  );

  app.get(
    '/assets',
    async (req: Request, res: Response) => {
      const characterId = getCharacterId();
      const token = await provider.getToken(characterId, requiredScopes);
      // TODO(EIP-16) swallowing exceptions here
      const assets = await EsiCacheUtil.gen(
        characterId.toString(),
        EsiCacheItem.ASSETS,
        hoursToSeconds(6),
        async () => await eveQuery.genAllAssets(token, characterId),
      );

      const assetService = Container.get(AssetsService);
      const output = await assetService.getData(token, assets);
      res.json(output);
    },
  );

  app.get(
    '/contracts',
    async (req: Request, res: Response) => {
      const characterId = getCharacterId();
      const token = await provider.getToken(characterId, requiredScopes);
      const contracts = await esiQuery.genxContracts(token, characterId);

      const contractsService = Container.get(ContractsService);
      const output = await contractsService.getData(token, contracts);
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
      res.json(portrait);
    },
  );
};

export default controller;