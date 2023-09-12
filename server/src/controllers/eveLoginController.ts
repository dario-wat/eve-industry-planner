import { Router, Request, Response } from 'express';
import { Container } from 'typedi';
import { EvePortrait } from '../types/EsiQuery';
import { SSO_STATE } from '../config/eveSsoConfig';
import { requiredScopes } from '../const/EveScopes';
import { DOMAIN } from '../const/ServerConst';
import EsiProviderService from '../core/esi/EsiProviderService';
import EsiTokenlessQueryService from '../core/query/EsiTokenlessQueryService';
import { EsiCharacter } from '../core/esi/models/EsiCharacter';
import ActorContext from '../core/actor_context/ActorContext';
import AccountService from '../core/account/AccountService';

// TODO needs to be refactored and moved away

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  const esi = Container.get(EsiProviderService).get();
  const esiQuery = Container.get(EsiTokenlessQueryService);

  route.get('/login_url', (req: Request, res: Response) => {
    res.send(esi.getRedirectUrl(SSO_STATE, requiredScopes));
  });

  // TODO ugly and needs to be cleaned up
  route.get('/sso_callback', async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const { character } = await esi.register(code);

    const accountService = Container.get(AccountService);

    const c = (await EsiCharacter.findByPk(character.characterId))!;
    const ac: ActorContext = res.locals.actorContext;
    const account = await accountService.genLink(
      ac, c
    );

    // TODO these two should be deleted
    req.session.characterId = character.characterId;
    req.session.characterName = character.characterName;

    req.session.accountId = account.id;

    res.redirect(DOMAIN);
  });

  // TODO should I be having this like this ?
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