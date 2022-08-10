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

  async function esiRequest(uri: string) {
    const token = await provider.getToken(characterId, requiredScopes);
    const result = await esi.request(
      uri,
      undefined,
      undefined,
      { token },
    );

    return await result.json();
  }

  app.get('/industry_jobs', async (req: Request, res: Response) => {
    const resultJson = esiRequest(`/characters/${characterId}/industry/jobs/`);
    res.json(resultJson);
  });
};

export default controller;