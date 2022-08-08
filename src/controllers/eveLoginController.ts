import { Router, Request, Response } from 'express';
import SingleSignOn from 'eve-sso';
import { CLIENT_ID, SECRET, CALLBACK_URI, SSO_STATE } from '../lib/eve_sso/eveSsoConfig';
import eveScopes from '../lib/eve_sso/eveScopes';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  const sso = new SingleSignOn(
    CLIENT_ID,
    SECRET,
    CALLBACK_URI,
    {
      endpoint: 'https://login.eveonline.com', // optional, defaults to this
      userAgent: 'my-user-agent' // optional
    },
  );

  route.get('/login_url', (req: Request, res: Response) => {
    res.send(sso.getRedirectUrl(SSO_STATE, eveScopes));
  });

  route.get('/sso_callback', async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const info = await sso.getAccessToken(code);
    // TODO store access token
    console.log(info);
    res.redirect('http://localhost:3000');
  });
};

export default controller;