import { DataTypes, Model, Sequelize } from 'sequelize';

export class WalletTransaction extends Model { }

export const walletTransactionModelDefine =
  (sequelize: Sequelize) => WalletTransaction.init(
    {
      transaction_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
      },
      client_id: DataTypes.BIGINT,
      date: DataTypes.STRING,
      is_buy: DataTypes.BOOLEAN,
      is_personal: DataTypes.BOOLEAN,
      journal_ref_id: DataTypes.BIGINT,
      location_id: DataTypes.BIGINT,
      quantity: DataTypes.BIGINT,
      type_id: DataTypes.BIGINT,
      unit_price: DataTypes.BIGINT,
      character_id: DataTypes.BIGINT,
    },
    {
      sequelize,
      modelName: WalletTransaction.name,
      tableName: 'wallet_transactions',
      timestamps: false,
    },
  );