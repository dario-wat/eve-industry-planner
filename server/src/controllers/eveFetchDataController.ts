import { Router, Request, Response } from 'express';
import { Container } from 'typedi';
import { requiredScopes } from '../lib/eve_sso/eveScopes';
import EsiProviderService from '../services/EsiProviderService';
import EveMemoryProviderService from '../services/EveMemoryProviderService';
import GlobalMemory from '../lib/GlobalMemory_DO_NOT_USE';
import { IndustryActivityKey, industryActivity } from '../lib/IndustryActivity';
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

      // TODO hardcoded for testing
      const stat = await EveQuery.genxStructure(token, 1038046192011);

      const statJson = await stat.json();
      // console.log(statJson);

      const industryJobsJson = await industryJobs.json();

      const industryJobService = Container.get(IndustryJobService);
      const resu = await industryJobService.transform(token, industryJobsJson[0]);
      console.log(resu);
      const out = industryJobsJson.map((job: any) => ({
        activity: industryActivity[job.activity_id as IndustryActivityKey].activityName,
        blueprint_name: job.blueprint_type_id,
        duration: job.duration,
        end_date: job.end_date,
        runs: job.runs,
        location: job.station_id,
        status: job.status,
        product_name: job.product_type_id
      }));

      res.json(out);
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