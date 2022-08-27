import { Provider } from 'eve-esi-client';
import MemoryProvider from 'eve-esi-client/dist/providers/memory';
import { Service } from 'typedi';

@Service()
export default class EveMemoryProviderService {
  private provider: Provider;

  constructor() {
    this.provider = new MemoryProvider();
  }

  public get(): Provider {
    return this.provider;
  }
}