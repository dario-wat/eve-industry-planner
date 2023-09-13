import { Request, Response } from 'express';
import { Service } from 'typedi';
import { EvePortrait } from '../../types/EsiQuery';
import { SSO_STATE } from '../../config/eveSsoConfig';
import { requiredScopes } from '../../const/EveScopes';
import { DOMAIN } from '../../const/ServerConst';
import EsiProviderService from '../esi/EsiProviderService';
import EsiTokenlessQueryService from '../query/EsiTokenlessQueryService';
import { EsiCharacter } from '../esi/models/EsiCharacter';
import ActorContext from '../actor_context/ActorContext';
import AccountService from '../account/AccountService';
import Controller from './Controller';

@Service()
export default class EveLoginController extends Controller {

  constructor(
    private readonly esi: EsiProviderService,
    private readonly esiQuery: EsiTokenlessQueryService,
    private readonly accountService: AccountService,
  ) {
    super();
  }

  protected initController(): void {
    /** Fetches the login URL for ESI SSO. */
    this.appGet(
      '/login_url',
      async (_req: Request, res: Response, _actorContext: ActorContext) => {
        res.send(this.esi.get().getRedirectUrl(SSO_STATE, requiredScopes));
      },
    );

    /** 
     * Gets called by ESI SSO after login is successful.
     * This will create a session with accountId and link the character
     * to the existing account if there is one.
     */
    this.appGet(
      '/sso_callback',
      async (req: Request, res: Response, actorContext: ActorContext) => {
        const code = req.query.code as string;
        const { character } = await this.esi.get().register(code);

        const esiCharacter = (await EsiCharacter.findByPk(character.characterId))!;
        const account = await this.accountService.genLink(
          actorContext,
          esiCharacter,
        );

        req.session.accountId = account.id;

        res.redirect(DOMAIN);
      },
    );

    // TODO should I be having this like this ?
    this.appGet(
      '/logged_in_user',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        const main = await actorContext.genMainCharacter();
        let portrait: EvePortrait | null = null;
        if (main) {
          portrait = await this.esiQuery.genxPortrait(main.characterId);
        }
        res.json({
          character_id: main?.characterId,
          character_name: main?.characterName,
          portrait: portrait?.px64x64,
        });
      },
    );

    /** Logs out the user by deleting its active session. */
    this.appDelete(
      '/logout',
      async (req: Request, res: Response, _actorContext: ActorContext) => {
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
      },
    );
  }
}