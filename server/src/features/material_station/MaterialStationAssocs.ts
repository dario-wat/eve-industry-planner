import { Account } from '../../core/account/Account';
import { MaterialStation } from './MaterialStation';

export function materialStationAssocsDefine(): void {
  /** 
   * Each account can set up multiple material stations.
   * In the ideal world, this would be an N-N assoc between accounts
   * and stations, but because stations are SDE, we cannot have foreign
   * keys on the table.
   */
  Account.hasMany(
    MaterialStation,
    {
      foreignKey: 'accountId',
      onDelete: 'CASCADE',
    },
  );
  MaterialStation.belongsTo(
    Account,
    {
      foreignKey: 'accountId',
      onDelete: 'SET NULL',
    },
  );
}