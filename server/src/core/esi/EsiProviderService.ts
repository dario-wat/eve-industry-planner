import { Service } from 'typedi';
import ESI from 'eve-esi-client';
import EsiSequelizeProvider from './EsiSequelizeProvider';

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
      callbackUri: process.env.HOSTNAME!,   // AWS adds this
    });
  }

  public get(): ESI {
    return this.esi;
  }
}