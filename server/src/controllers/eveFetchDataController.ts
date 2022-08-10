import { Router, Request, Response } from 'express';
import { Container } from 'typedi';
import { requiredScopes } from '../lib/eve_sso/eveScopes';
import EsiProviderService from '../services/EsiProviderService';
import EveMemoryProviderService from '../services/EveMemoryProviderService';
import GlobalMemory from '../lib/GlobalMemory_DO_NOT_USE';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  const esi = Container.get(EsiProviderService).get();
  const provider = Container.get(EveMemoryProviderService).get();

  // TODO should be queried inside the callback function since it's
  // not really a service. this is a temporary solution
  // until I get a database running
  const getCharacterId = () => GlobalMemory.characterId as number;

  app.get(
    '/industry_jobs',
    async (req: Request, res: Response) => {
      const characterId = getCharacterId();
      const token = await provider.getToken(characterId, requiredScopes);
      const result = await esi.request(
        `/characters/${characterId}/industry/jobs/`,
        undefined,
        undefined,
        { token },
      );

      const resultJson = await result.json();
      res.json(resultJson);
    },
  );

  app.get(
    '/assets',
    async (req: Request, res: Response) => {
      const characterId = getCharacterId();
      const token = await provider.getToken(characterId, requiredScopes);
      const result = await esi.request(
        `/characters/${characterId}/assets/`,
        undefined,
        undefined,
        { token },
      );

      const resultJson = await result.json();
      res.json(resultJson);
    },
  );
};

export default controller;