import { Request, Response } from 'express';
import { Service } from 'typedi';
import { requiredScopes } from '../../const/EveScopes';
import EsiProviderService from '../esi/EsiProviderService';
import { EsiCharacter } from '../esi/models/EsiCharacter';
import ActorContext from '../actor_context/ActorContext';
import AccountService from '../account/AccountService';
import Controller from './Controller';

@Service()
export default class EveLoginController extends Controller {

  constructor(
    private readonly esi: EsiProviderService,
    private readonly accountService: AccountService,
  ) {
    super();
  }

  protected initController(): void {
    /** Fetches the login URL for ESI SSO. */
    this.appGet(
      '/login_url',
      async (_req: Request, res: Response, _actorContext: ActorContext) => {
        res.send(
          // TODO use generated SSO state on callback
          this.esi.get().getRedirectUrl(process.env.ESI_SSO_STATE!, requiredScopes)
        );
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

        // This matches the github pages base url
        res.redirect(process.env.CLIENT_DOMAIN! + '/eve-industry-planner');
      },
    );

    this.appGet(
      '/logged_in_user',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        const characters = await actorContext.genLoggedInLinkedCharacters();
        res.json({
          character_ids: characters.map(character => character.characterId),
          character_names: characters.map(character => character.characterName),
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