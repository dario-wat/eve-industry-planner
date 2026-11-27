import { Account } from '../../core/account/Account';
import { TradeSettings } from './TradeSettings';

export function tradeSettingsAssocsDefine(): void {
  Account.hasOne(
    TradeSettings,
    {
      foreignKey: 'accountId',
      onDelete: 'CASCADE',
    },
  );
  TradeSettings.belongsTo(
    Account,
    {
      foreignKey: 'accountId',
      onDelete: 'CASCADE',
    },
  );
}
