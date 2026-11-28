import { Service } from 'typedi';
import EsiQueryService from '../../core/esi/EsiQueryService';
import { EsiCharacter } from '../../core/esi/models/EsiCharacter';
import { WalletJournalEntry } from './WalletJournalEntry';
import { WalletTransaction } from './WalletTransaction';

export type WalletSyncResult = {
  /** Counts returned by ESI, including rows already stored. */
  stored: { characterId: number; journalEntries: number; transactions: number }[];
  failed: { characterId: number; error: string }[];
  skippedLoggedOut: number[];
};

/** Kept apart from WalletService so the sync job does not need EveSdeData loaded. */
@Service()
export default class WalletSyncService {

  constructor(
    private readonly esiQuery: EsiQueryService,
  ) { }

  /** Characters one at a time, like the net worth job, to keep ESI load low. */
  public async genxSyncAllWallets(): Promise<WalletSyncResult> {
    const result: WalletSyncResult = { stored: [], failed: [], skippedLoggedOut: [] };
    for (const character of await EsiCharacter.findAll()) {
      if (!(await character.isLoggedIn())) {
        result.skippedLoggedOut.push(character.characterId);
        continue;
      }
      try {
        const journalEntries = await this.genxSyncWalletJournal(character.characterId);
        const transactions = await this.genxSyncWalletTransactions(character.characterId);
        result.stored.push({ characterId: character.characterId, journalEntries, transactions });
      } catch (error) {
        console.error(`Wallet sync failed for ${character.characterId}`, error);
        result.failed.push({
          characterId: character.characterId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return result;
  }

  /** ESI keeps 30 days of journal, so this has to run at least that often to keep everything. */
  private async genxSyncWalletJournal(characterId: number): Promise<number> {
    const journal = await this.esiQuery.genxAllWalletJournal(characterId);
    await WalletJournalEntry.bulkCreate(
      journal.map(journalEntry => ({ characterId, ...journalEntry })),
      { ignoreDuplicates: true },
    );
    return journal.length;
  }

  /** ESI returns only the latest 2,500 transactions; older ones exist only in the DB. */
  private async genxSyncWalletTransactions(characterId: number): Promise<number> {
    const transactions = await this.esiQuery.genxWalletTransactions(characterId);
    await WalletTransaction.bulkCreate(
      transactions.map(transaction => ({ characterId, ...transaction })),
      { ignoreDuplicates: true },
    );
    return transactions.length;
  }
}
