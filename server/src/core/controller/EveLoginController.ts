import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Request, Response } from 'express';
import { Service } from 'typedi';
import { requiredScopes } from '../../const/EveScopes';
import EsiClientService from '../esi/EsiClientService';
import EsiTokenStore from '../esi/EsiTokenStore';
import ActorContext from '../actor_context/ActorContext';
import AccountService from '../account/AccountService';
import Controller from './Controller';

@Service()
export default class EveLoginController extends Controller {
  constructor(
    private readonly esiClientService: EsiClientService,
    private readonly esiTokenStore: EsiTokenStore,
    private readonly accountService: AccountService,
  ) {
    super();
  }

  protected initController(): void {
    /** Fetches the login URL for ESI SSO. */
    this.appGet('/login_url', async (req: Request, res: Response, _actorContext: ActorContext) => {
      // Random state, kept in the session and checked on the callback (CSRF).
      const state = randomBytes(32).toString('hex');
      req.session.ssoStates = [...(req.session.ssoStates ?? []), state].slice(
        -MAX_PENDING_SSO_STATES,
      );
      res.send(this.esiClientService.get().auth.getLoginUrl(state, requiredScopes));
    });

    /**
     * Gets called by ESI SSO after login is successful.
     * This will create a session with accountId and link the character
     * to the existing account if there is one.
     */
    this.appGet(
      '/sso_callback',
      async (req: Request, res: Response, actorContext: ActorContext) => {
        // The state must be one this session issued, and each works only once.
        const pendingStates = req.session.ssoStates ?? [];
        const matchIndex = pendingStates.findIndex((state) =>
          isSameState(state, req.query.state),
        );
        if (matchIndex === -1) {
          res.status(400).send('Invalid login state. Start the login again.');
          return;
        }
        req.session.ssoStates = pendingStates.filter((_, i) => i !== matchIndex);

        const code = req.query.code as string;
        const login = await this.esiClientService.get().auth.exchangeCode(code);
        const esiCharacter = await this.esiTokenStore.genxSaveLogin(login);

        const account = await this.accountService.genLink(actorContext, esiCharacter);

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
          character_ids: characters.map((character) => character.characterId),
          character_names: characters.map((character) => character.characterName),
        });
      },
    );

    /** Logs out the user by deleting its active session. */
    this.appDelete('/logout', async (req: Request, res: Response, _actorContext: ActorContext) => {
      if (req.session) {
        req.session.destroy((err) => {
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
  }
}

/** Login URLs a session can have outstanding. The oldest ones are dropped. */
const MAX_PENDING_SSO_STATES = 5;

/** True if the callback's `state` is `expected`. */
function isSameState(expected: string, received: unknown): boolean {
  if (typeof received !== 'string') {
    return false;
  }
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}
