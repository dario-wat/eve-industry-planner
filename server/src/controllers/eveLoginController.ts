import { Router, Request, Response } from 'express';
import { Container } from 'typedi';
import { SSO_STATE } from '../config/eveSsoConfig';
import { requiredScopes } from '../const/EveScopes';
import EsiProviderService from '../services/foundation/EsiProviderService';
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
    GlobalMemory.characterName = character.characterName;

    req.session.characterId = character.characterId;
    req.session.characterName = character.characterName;
    console.log(req.session);
    console.log(req.session.id);
    console.log(req.cookies);

    res.redirect('http://localhost:3000');
  });

  // TODO is this the best place to do it?
  route.get('/logged_in_user', (req: Request, res: Response) => {
    res.json({
      character_id: GlobalMemory.characterId,
      character_name: GlobalMemory.characterName,
    });
  });

  // TODO add log out
};

export default controller;