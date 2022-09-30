import { Service } from 'typedi';
import EsiTokenlessQueryService from '../query/EsiTokenlessQueryService';
import EveQueryService from '../query/EveQueryService';

// TODO finish
@Service()
export default class MarketService {

  constructor(
    private readonly eveQuery: EveQueryService,
    private readonly esiQuery: EsiTokenlessQueryService,
  ) { }

  public async genWalletTransactions(characterId: number): Promise<void> {
    const transactions = await this.esiQuery.genxWalletTransactions(characterId);
    console.log(transactions);
  }

  public async genMarketOrders(characterId: number): Promise<void> {
    const orders = await this.esiQuery.genxMarketOrders(characterId);
    console.log(orders);
  }
}