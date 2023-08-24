import { Account } from '../../core/account/Account';
import { AlwaysBuyItem } from './AlwaysBuyItem';

export function alwaysBuyItemAssocsDefine(): void {
  /**
   * Each account can set multiple Always-Buy items. And each Always-Buy item 
   * belongs to only one account. This is technically not correct since 
   * Always-Buy items are just TypeIDs, but since TypeIDs is a part of SDE,
   * there is a chance that the table will need to be dropped and rebuilt
   * which would not be possible if we had foreign keys.
   * So instead we create this AlwaysBuyItem object that just contains
   * a TypeID.
   */
  Account.hasMany(
    AlwaysBuyItem,
    {
      foreignKey: 'accountId',
      onDelete: 'CASCADE',
    },
  );
  AlwaysBuyItem.belongsTo(
    Account,
    {
      foreignKey: 'accountId',
      onDelete: 'SET NULL',
    },
  );
}