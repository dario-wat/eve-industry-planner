import { EsiCharacter } from '../esi/models/EsiCharacter';
import { Account } from './Account';

export function accountAssocsDefine(): void {
  /**
   * Each Account can contain multiple EsiCharacters. 
   * Check out docs for Account.
   */
  Account.hasMany(
    EsiCharacter,
    {
      foreignKey: 'accountId',
      onDelete: 'CASCADE',
    },
  );
  EsiCharacter.belongsTo(
    Account,
    {
      foreignKey: 'accountId',
      onDelete: 'SET NULL',
    },
  );
}