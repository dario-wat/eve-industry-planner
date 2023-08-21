import { Account } from '../../core/account/Account';
import { Scribble } from './Scribble';

export function scribbleAssocsDefine(): void {
  /** Scribbles belong to accounts. Each account can own multiple scribbles. */
  Account.hasMany(
    Scribble,
    {
      foreignKey: 'accountId',
      onDelete: 'CASCADE',
    },
  );
  Scribble.belongsTo(
    Account,
    {
      foreignKey: 'accountId',
      onDelete: 'SET NULL',
    },
  );
}