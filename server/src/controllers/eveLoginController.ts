import { Router, Request, Response } from 'express';
import ESI, { Provider } from 'eve-esi-client';
import { CLIENT_ID, SECRET, CALLBACK_URI, SSO_STATE } from '../eve_sso/EveSsoConfig';
import { industryJobsScope } from '../eve_sso/eveScopes';

const route = Router();

const controller = (app: Router, provider: Provider) => {
  app.use('/', route);

  const esi = new ESI({
    provider,
    clientId: CLIENT_ID,
    secretKey: SECRET,
    callbackUri: CALLBACK_URI,
  })

  route.get('/login_url', (req: Request, res: Response) => {
    // We can only send a single scope here. Sending multiple
    // scopes will cause a 403 on ESI
    // TODO parametrize the scope
    res.send(esi.getRedirectUrl(SSO_STATE, industryJobsScope));
  });

  route.get('/sso_callback', async (req: Request, res: Response) => {
    const code = req.query.code as string;
    await esi.register(code);
    res.redirect('http://localhost:3000');
  });
};

export default controller;