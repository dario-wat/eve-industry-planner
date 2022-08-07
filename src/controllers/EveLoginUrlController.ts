import { Router, Request, Response } from 'express';
import SingleSignOn from 'eve-sso';
import { CLIENT_ID, SECRET, CALLBACK_URI, SSO_STATE } from '../lib/eve_sso/eveSsoConfig';
import eveScopes from '../lib/eve_sso/eveScopes';

// TODO can I use absolute paths?
const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  route.get('/login_url', (req: Request, res: Response) => {
    const sso = new SingleSignOn(
      CLIENT_ID,
      SECRET,
      CALLBACK_URI,
      {
        endpoint: 'https://login.eveonline.com', // optional, defaults to this
        userAgent: 'my-user-agent' // optional
      },
    );
    res.send(sso.getRedirectUrl(SSO_STATE, eveScopes));
  });
};

export default controller;