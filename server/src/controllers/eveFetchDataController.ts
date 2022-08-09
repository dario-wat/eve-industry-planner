import { Router, Request, Response } from 'express';
import { Container } from 'typedi';
import EsiProvider from '../eve_sso/EsiProvider';
import { requiredScopes } from '../eve_sso/eveScopes';
import { DIKey } from '../lib/DIKey';
import { Provider } from 'eve-esi-client';

const route = Router();

const controller = (app: Router, provider: Provider) => {
  app.use('/', route);

  const esi = EsiProvider.get();
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