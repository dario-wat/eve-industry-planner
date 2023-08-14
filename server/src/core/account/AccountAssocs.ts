import { EsiCharacter } from '../../models/esi_provider/EsiCharacter';
import { Account } from './Account';

export function accountAssocsDefine(): void {
  /**
   * Each Account can contain multiple EsiCharacters. 
   * Check out docs for Account.
   */
  Account.hasMany(
    EsiCharacter,
    {
      onDelete: 'SET NULL',
      foreignKey: 'accountId',
    },
  );
  EsiCharacter.belongsTo(Account, { foreignKey: 'accountId' });
}