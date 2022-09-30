import { Service } from 'typedi';
import EveSdeData from '../query/EveSdeData';
import EsiTokenlessQueryService from '../query/EsiTokenlessQueryService';
import EveQueryService from '../query/EveQueryService';
import { WalletTransactionsRes } from '@internal/shared';

@Service()
export default class MarketService {

  constructor(
    private readonly eveQuery: EveQueryService,
    private readonly sdeData: EveSdeData,
    private readonly esiQuery: EsiTokenlessQueryService,
  ) { }

  public async genWalletTransactions(
    characterId: number,
  ): Promise<WalletTransactionsRes> {
    const transactions = await this.esiQuery.genxWalletTransactions(characterId);
    const stationNames = await this.eveQuery.genAllStationNames(
      characterId,
      transactions.map(t => t.location_id),
    );

    return transactions
      .filter(t => t.is_personal)
      .map(t => ({
        date: t.date,
        isBuy: t.is_buy,
        locationName: stationNames[t.location_id] ?? null,
        locationId: t.location_id,
        quantity: t.quantity,
        typeId: t.type_id,
        name: this.sdeData.types[t.type_id].name,
        categoryId: this.sdeData.categoryIdFromTypeId(t.type_id),
        unitPrice: t.unit_price,
      }));
  }

  // TODO finish
  public async genMarketOrders(characterId: number): Promise<void> {
    const orders = await this.esiQuery.genxMarketOrders(characterId);
    console.log(orders);
  }
}