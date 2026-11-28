import { FeesAndTaxesRes, WalletTransactionsRes } from '@internal/shared';
import ActorContext from '../../core/actor_context/ActorContext';
import { Service } from 'typedi';
import EveSdeData from '../../core/sde/EveSdeData';
import { genQueryFlatPerCharacter } from '../../lib/eveUtil';
import StationService from '../../core/query/StationService';

@Service()
export default class WalletService {

  constructor(
    private readonly sdeData: EveSdeData,
    private readonly stationService: StationService,
  ) { }

  /** Wallet transactions data for Market page, or for one item. */
  public async genWalletTransactionsForPage(
    actorContext: ActorContext,
    typeId: number | null = null,
  ): Promise<WalletTransactionsRes> {
    const transactions = await genQueryFlatPerCharacter(
      actorContext,
      character => character.getWalletTransactions(
        typeId === null ? undefined : { where: { type_id: typeId } },
      ),
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

  /** Returns all broker fees and transaction taxes from the wallet journal. */
  public async genFeesAndTaxesForPage(
    actorContext: ActorContext,
  ): Promise<FeesAndTaxesRes> {
    const walletJournal = await genQueryFlatPerCharacter(
      actorContext,
      character => character.getWalletJournalEntries(),
    );

    return walletJournal
      .filter(([_, journalEntry]) =>
        ['brokers_fee', 'transaction_tax'].includes(journalEntry.ref_type)
      )
      .map(([_character, journalEntry]) => ({
        date: journalEntry.date,
        amount: journalEntry.amount,
        type: journalEntry.ref_type,
      }));
  }
}
