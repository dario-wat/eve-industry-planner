import { Router, Request, Response } from 'express';
import { Container } from 'typedi';
import { requiredScopes } from '../lib/eve_sso/eveScopes';
import EveMemoryProviderService from '../services/foundation/EveMemoryProviderService';
import GlobalMemory from '../lib/GlobalMemory_DO_NOT_USE';
import IndustryJobService from '../services/product/IndustryJobService';
import AssetsService from '../services/product/AssetsService';
import EsiQueryService from '../services/query/EsiQueryService';
import ContractsService from '../services/product/ContractsService';
import EveCachedQueryService from '../services/query/EveCachedQueryService';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  const provider = Container.get(EveMemoryProviderService).get();
  const esiQuery = Container.get(EsiQueryService);
  const eveQuery = Container.get(EveCachedQueryService);

  // TODO(EIP-2) this is a temporary solution
  // until I get a database running
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
      const assets = await eveQuery.genAllAssets(token, characterId);

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
};

export default controller;