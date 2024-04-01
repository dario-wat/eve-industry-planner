import { BrokerFeesRes, WalletTransactionsRes } from '@internal/shared';
import ActorContext from '../../core/actor_context/ActorContext';
import { Service } from 'typedi';
import { WalletTransaction } from './WalletTransaction';
import EveSdeData from '../../core/sde/EveSdeData';
import EsiTokenlessQueryService from '../../core/query/EsiTokenlessQueryService';
import { genQueryFlatPerCharacter } from '../../lib/eveUtil';
import StationService from '../../core/query/StationService';
import { EsiCharacter } from '../../core/esi/models/EsiCharacter';
import EsiMultiPageQueryService from '../../core/query/EsiMultiPageQueryService';
import { WalletJournalEntry } from './WalletJournalEntry';

@Service()
export default class WalletService {

  constructor(
    private readonly sdeData: EveSdeData,
    private readonly esiQuery: EsiTokenlessQueryService,
    private readonly stationService: StationService,
    private readonly esiMultiPageQueryService: EsiMultiPageQueryService,
  ) { }

  /** Wallet transactions data for Market page. */
  public async genWalletTransactionsForPage(
    actorContext: ActorContext,
  ): Promise<WalletTransactionsRes> {
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

  public async genBrokerFeesForPage(
    actorContext: ActorContext,
  ): Promise<BrokerFeesRes> {
    const walletJournal = await genQueryFlatPerCharacter(
      actorContext,
      character => character.getWalletJournalEntries(),
    );

    return walletJournal
      .filter(([_, journalEntry]) => journalEntry.ref_type === 'brokers_fee')
      .map(([_character, journalEntry]) => ({
        date: journalEntry.date,
        amount: journalEntry.amount,
      }));
  }

  /**
   * Queries wallet transactions from ESI for all characters. 
   * Stores the transactions into the DB. This is used for longer
   * wallet transaction retention.
   */
  public async genSyncAllWalletTransactions(): Promise<void> {
    const allCharacters = await EsiCharacter.findAll();
    await Promise.all(allCharacters.map(async character => {
      let transactions;
      try {
        transactions = await this.esiQuery.genxWalletTransactions(
          character.characterId,
        )
      } catch (_error) {
        return;
      }

      // We are storing all transaction into the database for longer retention
      await WalletTransaction.bulkCreate(
        transactions.map(transaction => ({
          characterId: character.characterId,
          ...transaction,
        })),
        { ignoreDuplicates: true },
      );
    }));
  }

  public async genSyncWalletJournal(): Promise<void> {
    const allCharacters = await EsiCharacter.findAll();
    await Promise.all(allCharacters.map(async character => {
      let journal;
      try {
        journal = await this.esiMultiPageQueryService.genxAllWalletJournal(
          character,
        );
      } catch (_error) {
        return;
      }

      await WalletJournalEntry.bulkCreate(
        journal.map(journalEntry => ({
          characterId: character.characterId,
          ...journalEntry,
        })),
        { ignoreDuplicates: true },
      );
    }));
  }
}