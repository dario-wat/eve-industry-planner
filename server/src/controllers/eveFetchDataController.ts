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
  const characterId = () => GlobalMemory.characterId as number;

  // We need to pass in the string function (instead of string iself)
  // because we don't know the full string at the time of calling this
  // function. Most URIs have Character ID or something similar in them
  // and we can only know that when the request is being executed.
  function esiRequestCallback(uriFn: () => string) {
    return async (req: Request, res: Response) => {
      const token = await provider.getToken(characterId(), requiredScopes);
      const result = await esi.request(
        uriFn(),
        undefined,
        undefined,
        { token },
      );

      const resultJson = await result.json();
      res.json(resultJson);
    };
  }

  app.get(
    '/industry_jobs',
    esiRequestCallback(() => `/characters/${characterId()}/industry/jobs/`),
  );

  app.get(
    '/assets',
    esiRequestCallback(() => `/characters/${characterId()}/assets/`),
  );
};

export default controller;