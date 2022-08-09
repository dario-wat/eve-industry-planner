import { Router, Request, Response } from 'express';
import { Container } from 'typedi';
import { requiredScopes } from '../lib/eve_sso/eveScopes';
import { DIKey } from '../lib/DIKey';
import EsiProviderService from '../services/EsiProviderService';
import EveMemoryProviderService from '../services/EveMemoryProviderService';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  const esi = Container.get(EsiProviderService).get();
  const provider = Container.get(EveMemoryProviderService).get();
  const characterId = Container.get(DIKey.CHARACTER_ID) as number;

  app.get('/industry_jobs', async (req: Request, res: Response) => {
    const token = await provider.getToken(characterId, requiredScopes);
    const result = await esi.request(
      `/characters/${characterId}/industry/jobs/`,
      undefined,
      undefined,
      { token },
    );

    const resultJson = await result.json();
    res.json(resultJson);
  });
};

export default controller;