import { Account } from '../../core/account/Account';
import { PlannedProduct } from './PlannedProduct';

export function plannedProductAssocsDefine(): void {
  /** 
   * Planned products belong to accounts and each account can own multiple
   * planned products.
   */
  Account.hasMany(
    PlannedProduct,
    {
      foreignKey: 'accountId',
      onDelete: 'CASCADE',
    },
  );
  PlannedProduct.belongsTo(
    Account,
    {
      foreignKey: 'accountId',
      onDelete: 'SET NULL',
    },
  );
}