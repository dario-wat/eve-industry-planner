import { Router, Request, Response } from 'express';
import { Container } from 'typedi';
import { SSO_STATE } from '../lib/eve_sso/EveSsoConfig';
import { requiredScopes } from '../lib/eve_sso/eveScopes';
import EsiProviderService from '../services/EsiProviderService';
import GlobalMemory from '../lib/GlobalMemory_DO_NOT_USE';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  const esi = Container.get(EsiProviderService).get();

  route.get('/login_url', (req: Request, res: Response) => {
    res.send(esi.getRedirectUrl(SSO_STATE, requiredScopes));
  });

  route.get('/sso_callback', async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const { character } = await esi.register(code);

    // TODO(EIP-2) "store" to memory. should use a proper storage
    GlobalMemory.characterId = character.characterId;
    res.redirect('http://localhost:3000');
  });
};

export default controller;