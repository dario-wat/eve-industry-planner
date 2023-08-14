import { Router, Request, Response } from 'express';
import { Container } from 'typedi';
import { EvePortrait } from '../types/EsiQuery';
import { SSO_STATE } from '../config/eveSsoConfig';
import { requiredScopes } from '../const/EveScopes';
import { DOMAIN } from '../const/ServerConst';
import EsiProviderService from '../services/foundation/EsiProviderService';
import LinkedCharactersService from '../services/product/LinkedCharactersService';
import EsiTokenlessQueryService from '../services/query/EsiTokenlessQueryService';
import { EsiCharacter } from '../core/esi/EsiCharacter';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  const esi = Container.get(EsiProviderService).get();
  const esiQuery = Container.get(EsiTokenlessQueryService);

  route.get('/login_url', (req: Request, res: Response) => {
    res.send(esi.getRedirectUrl(SSO_STATE, requiredScopes));
  });

  route.get('/sso_callback', async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const { character } = await esi.register(code);

    const linkedCharactersService = Container.get(LinkedCharactersService);
    await linkedCharactersService.genLink(
      character.characterId,
      req.session.characterId,
    );

    req.session.characterId = character.characterId;
    req.session.characterName = character.characterName;

    res.redirect(DOMAIN);
  });

  route.get('/logged_in_user', async (req: Request, res: Response) => {
    let portrait: EvePortrait | null = null;
    if (req.session.characterId) {
      portrait = await esiQuery.genxPortrait(req.session.characterId);
    }
    res.json({
      character_id: req.session.characterId ?? null,
      character_name: req.session.characterName ?? null,
      portrait: portrait?.px64x64,
    });
  });

  route.post('/change_character', async (req: Request, res: Response) => {
    const character = await EsiCharacter.findByPk(req.body.characterId);
    req.session.characterId = req.body.characterId;
    req.session.characterName = character?.get().characterName;
    res.status(200).end();
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