import { EsiCharacter } from '../../core/esi/models/EsiCharacter';
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
}