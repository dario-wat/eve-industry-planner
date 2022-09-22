import { Router, Request, Response } from 'express';
import { Container } from 'typedi';
import { SSO_STATE } from '../config/eveSsoConfig';
import { requiredScopes } from '../const/EveScopes';
import EsiProviderService from '../services/foundation/EsiProviderService';

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

    req.session.characterId = character.characterId;
    req.session.characterName = character.characterName;

    // TODO do I need to type in the entire domain?
    res.redirect('http://localhost:3000');
  });

  route.get('/logged_in_user', (req: Request, res: Response) => {
    res.json({
      character_id: req.session.characterId ?? null,
      character_name: req.session.characterName ?? null,
    });
  });

  route.delete('/logout', (req: Request, res: Response) => {
    if (req.session) {
      req.session.destroy(err => {
        if (err) {
          res.status(400).end();
        } else {
          res.status(200).end();
        }
      });
    } else {
      res.end();
    }
  });
};

export default controller;