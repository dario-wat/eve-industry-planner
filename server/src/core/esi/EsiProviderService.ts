import { Service } from 'typedi';
import ESI from 'eve-esi-client';
import EsiSequelizeProvider from './EsiSequelizeProvider';

/** Identifies this app on every ESI request. CCP uses it to contact the developer. */
const USER_AGENT = 'eve-industry-planner/0.1.0 (daki1133@gmail.com; +https://github.com/dario-wat/eve-industry-planner)';

/**
 * Provides an ESI (connection) that is used for querying EVE data.
 */
@Service()
export default class EsiProviderService {
  private esi: ESI;

  constructor(
    provider: EsiSequelizeProvider,
  ) {
    this.esi = new ESI({
      provider: provider,
      clientId: process.env.ESI_CLIENT_ID!,
      secretKey: process.env.ESI_SECRET!,
      callbackUri: process.env.ESI_CALLBACK_URI!,
      userAgent: USER_AGENT,
    });
  }

  public get(): ESI {
    return this.esi;
  }
}