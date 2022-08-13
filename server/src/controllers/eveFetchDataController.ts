import { Router, Request, Response } from 'express';
import { Container } from 'typedi';
import { requiredScopes } from '../lib/eve_sso/eveScopes';
import EsiProviderService from '../services/EsiProviderService';
import EveMemoryProviderService from '../services/EveMemoryProviderService';
import GlobalMemory from '../lib/GlobalMemory_DO_NOT_USE';
import { IndustryActivityKey, industryActivity } from '../lib/IndustryActivity';
import { EveQuery } from '../lib/EveQuery';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  const esi = Container.get(EsiProviderService).get();
  const provider = Container.get(EveMemoryProviderService).get();

  // TODO(EIP-2) this is a temporary solution
  // until I get a database running
  const getCharacterId = () => GlobalMemory.characterId as number;

  app.get(
    '/industry_jobs',
    async (req: Request, res: Response) => {
      const characterId = getCharacterId();
      const token = await provider.getToken(characterId, requiredScopes);
      // const result = await esi.request(
      //   `/characters/${characterId}/industry/jobs/`,
      //   undefined,
      //   undefined,
      //   { token },
      // );
      const result = await EveQuery.genxIndustryJobs(token, characterId);

      const stat = await EveQuery.genxStructure(token, 1038046192011);

      const statJson = await stat.json();
      console.log(statJson);

      const resultJson = await result.json();
      // console.log(resultJson.map((res: any) => {
      //   const activityId = res.activity_id as IndustryActivityKey;
      //   return {
      //     activity: industryActivity[activityId].activityName,
      //   }
      // }));
      // const ids = resultJson.map((res: any) => [
      // res.blueprint_id,
      // res.blueprint_location_id,
      // res.blueprint_type_id, res.facility_id,
      // res.installer_id, res.job_id,
      // res.output_location_id, res.product_type_id,
      //   res.station_id,
      // ]).flat();
      // console.log(ids);
      // const names = await esi.request(
      //   '/universe/names/',
      //   undefined,
      //   { ids: [1038046192011] },
      //   // undefined,
      //   { token, method: "POST" },
      // );
      // console.log(names);
      res.json(resultJson);
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