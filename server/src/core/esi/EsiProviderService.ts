import { Service } from 'typedi';
import ESI from 'eve-esi-client';
import { CLIENT_ID, SECRET, CALLBACK_URI } from '../../config/eveSsoConfig';
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
      clientId: CLIENT_ID,
      secretKey: SECRET,
      callbackUri: CALLBACK_URI,
    });
  }

  public get(): ESI {
    return this.esi;
  }
}