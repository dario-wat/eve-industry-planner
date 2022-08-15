import { Router, Request, Response } from 'express';
import { Container } from 'typedi';
import { requiredScopes } from '../lib/eve_sso/eveScopes';
import EveMemoryProviderService from '../services/EveMemoryProviderService';
import GlobalMemory from '../lib/GlobalMemory_DO_NOT_USE';
import { EveQuery } from '../lib/EveQuery';
import IndustryJobService from '../services/IndustryJobService';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  const provider = Container.get(EveMemoryProviderService).get();

  // TODO(EIP-2) this is a temporary solution
  // until I get a database running
  const getCharacterId = () => GlobalMemory.characterId as number;

  app.get(
    '/industry_jobs',
    async (req: Request, res: Response) => {
      const characterId = getCharacterId();
      const token = await provider.getToken(characterId, requiredScopes);
      const industryJobs = await EveQuery.genxIndustryJobs(token, characterId);

      const industryJobService = Container.get(IndustryJobService);
      const output = await Promise.all(industryJobs.map(
        (job: any) => industryJobService.getData(token, job),
      ));
      res.json(output);
    },
  );

  app.get(
    '/assets',
    async (req: Request, res: Response) => {
      const characterId = getCharacterId();
      const token = await provider.getToken(characterId, requiredScopes);
      const result = await EveQuery.genxAssets(token, characterId);

      const resultJson = await result.json();
      res.json(resultJson);
    },
  );
};

export default controller;