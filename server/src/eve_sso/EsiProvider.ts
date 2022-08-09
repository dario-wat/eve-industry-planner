import ESI, { Provider } from 'eve-esi-client';
import { CLIENT_ID, SECRET, CALLBACK_URI } from './EveSsoConfig';

export default class EsiProvider {
  private static instance: ESI;

  public static init(provider: Provider) {
    if (EsiProvider.instance) {
      throw new Error('Provider already initialized');
    }
    EsiProvider.instance = new ESI({
      provider,
      clientId: CLIENT_ID,
      secretKey: SECRET,
      callbackUri: CALLBACK_URI,
    });
  }

  public static get(): ESI {
    if (!EsiProvider.instance) {
      throw new Error('Provider not initialized');
    }

    return EsiProvider.instance;
  }
}