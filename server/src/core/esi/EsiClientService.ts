import { EsiClient, type EsiSsoConfig } from 'eve-esi';
import { Service } from 'typedi';
import EsiTokenStore from './EsiTokenStore';

/** Identifies this app on every ESI request. CCP uses it to contact the developer. */
const USER_AGENT = 'eve-industry-planner/0.1.0 (daki1133@gmail.com; +https://github.com/dario-wat/eve-industry-planner)';

/**
 * Builds the one EsiClient the app uses. Tokens are stored by EsiTokenStore.
 *
 * Login and logged-in endpoints need ESI_CLIENT_ID, ESI_SECRET and
 * ESI_CALLBACK_URI. Without them the client still works for public endpoints
 * (market history, orders, stations, ...), so processes that only read
 * public data don't need those secrets.
 */
@Service()
export default class EsiClientService {
  private readonly esi: EsiClient;

  constructor(tokenStore: EsiTokenStore) {
    this.esi = new EsiClient({
      userAgent: USER_AGENT,
      sso: ssoConfigFromEnv(),
      tokens: {
        load: (characterId) => tokenStore.genLoadTokenSet(characterId),
        save: (characterId, tokens) => tokenStore.genxSaveTokenSet(characterId, tokens),
      },
    });
  }

  public get(): EsiClient {
    return this.esi;
  }
}

function ssoConfigFromEnv(): EsiSsoConfig | undefined {
  const { ESI_CLIENT_ID, ESI_SECRET, ESI_CALLBACK_URI } = process.env;
  if (!ESI_CLIENT_ID || !ESI_SECRET || !ESI_CALLBACK_URI) {
    return undefined;
  }
  return {
    clientId: ESI_CLIENT_ID,
    secretKey: ESI_SECRET,
    callbackUri: ESI_CALLBACK_URI,
  };
}
