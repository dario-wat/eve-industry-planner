import { Router, Request, Response } from 'express';
import { SSO_STATE } from '../eve_sso/EveSsoConfig';
import { requiredScopes } from '../eve_sso/eveScopes';
import EsiProvider from '../eve_sso/EsiProvider';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  const esi = EsiProvider.get();

  route.get('/login_url', (req: Request, res: Response) => {
    res.send(esi.getRedirectUrl(SSO_STATE, requiredScopes));
  });

  route.get('/sso_callback', async (req: Request, res: Response) => {
    const code = req.query.code as string;
    await esi.register(code);
    res.redirect('http://localhost:3000');
  });
};

export default controller;