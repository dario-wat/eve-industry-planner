import { EsiCharacter } from '../../core/esi/models/EsiCharacter';
import { WalletJournalEntry } from './WalletJournalEntry';
import { WalletTransaction } from './WalletTransaction';

export function walletTransactionAssocsDefine() {
  /** Each wallet transaction belongs to one specific character. */
  EsiCharacter.hasMany(
    WalletTransaction,
    {
      foreignKey: 'characterId',
      onDelete: 'CASCADE',
    },
  );
  WalletTransaction.belongsTo(
    EsiCharacter,
    {
      foreignKey: 'characterId',
      onDelete: 'SET NULL',
    },
  );

  /** Each wallet journal entry belongs to one specific character. */
  EsiCharacter.hasMany(
    WalletJournalEntry,
    {
      foreignKey: 'characterId',
      onDelete: 'CASCADE',
    },
  );
  WalletJournalEntry.belongsTo(
    EsiCharacter,
    {
      foreignKey: 'characterId',
      onDelete: 'SET NULL',
    },
  );
}