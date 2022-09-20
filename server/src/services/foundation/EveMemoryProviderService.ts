import { Provider } from 'eve-esi-client';
import MemoryProvider from 'eve-esi-client/dist/providers/memory';
import EsiSequelizeProvider from '../../lib/esi_sequelize_provider/EsiSequelizeProvider';
import { Service } from 'typedi';

@Service()
export default class EveMemoryProviderService {
  private provider: Provider;

  constructor() {
    // this.provider = new MemoryProvider();
    this.provider = new EsiSequelizeProvider();
  }

  public get(): Provider {
    return this.provider;
  }
}