import { WalletTransactionsRes } from '@internal/shared';
import ActorContext from '../../core/actor_context/ActorContext';
import { Service } from 'typedi';
import { WalletTransaction } from './WalletTransaction';
import EveSdeData from '../../core/sde/EveSdeData';
import EsiTokenlessQueryService from '../../core/query/EsiTokenlessQueryService';
import { genQueryFlatPerCharacter } from '../../lib/eveUtil';
import StationService from '../../core/query/StationService';

@Service()
export default class WalletService {

  constructor(
    private readonly sdeData: EveSdeData,
    private readonly esiQuery: EsiTokenlessQueryService,
    private readonly stationService: StationService,
  ) { }

  /** Wallet transactions data for Market page. */
  public async genWalletTransactionsForPage(
    actorContext: ActorContext,
  ): Promise<WalletTransactionsRes> {
    // TODO this should be done in a scheduled task
    await this.genSyncWalletTransactions(actorContext);

    const transactions = await genQueryFlatPerCharacter(
      actorContext,
      character => character.getWalletTransactions(),
    );

    const stationNames = await this.stationService.genAllStationNames(
      actorContext,
      transactions.map(([_, t]) => t.location_id),
    );

    return transactions
      .filter(([_, t]) => t.is_personal)
      .map(([character, t]) => ({
        characterName: character.characterName,
        date: t.date,
        isBuy: t.is_buy,
        locationName: stationNames[t.location_id] ?? null,
        locationId: t.location_id,
        quantity: t.quantity,
        typeId: t.type_id,
        name: this.sdeData.types[t.type_id]?.name,
        categoryId: this.sdeData.categoryIdFromTypeId(t.type_id),
        unitPrice: t.unit_price,
      }));
  }

  /**
   * Queries wallet transactions from ESI for all characters linked to the
   * given actor context. Stores the transactions into the DB.
   * This is used for longer wallet transaction retention.
   */
  private async genSyncWalletTransactions(
    actorContext: ActorContext,
  ): Promise<void> {
    const transactions = await genQueryFlatPerCharacter(
      actorContext,
      character => this.esiQuery.genxWalletTransactions(character.characterId),
    );

    // We are storing all transaction into the database for longer retention
    await WalletTransaction.bulkCreate(
      transactions.map(([character, transaction]) => ({
        characterId: character.characterId,
        ...transaction,
      })),
      { ignoreDuplicates: true },
    );
  }
}