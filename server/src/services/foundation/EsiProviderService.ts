import { Service } from 'typedi';
import ESI from 'eve-esi-client';
import { CLIENT_ID, SECRET, CALLBACK_URI } from '../../lib/eve_sso/EveSsoConfig';
import EveMemoryProviderService from './EveMemoryProviderService';

@Service()
export default class EsiProviderService {
  private esi: ESI;

  constructor(
    providerService: EveMemoryProviderService,
  ) {
    const memoryProvider = providerService.get();
    this.esi = new ESI({
      provider: memoryProvider,
      clientId: CLIENT_ID,
      secretKey: SECRET,
      callbackUri: CALLBACK_URI,
    });
  }

  public get(): ESI {
    return this.esi;
  }
}