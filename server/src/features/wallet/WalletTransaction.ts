import { EsiCharacter } from 'core/esi/models/EsiCharacter';
import {
  BelongsToGetAssociationMixin,
  DataTypes,
  ForeignKey,
  Model,
  Sequelize,
} from 'sequelize';

export class WalletTransaction extends Model {

  declare location_id: number;
  declare is_personal: boolean;
  declare date: string;
  declare is_buy: boolean;
  declare quantity: number;
  declare type_id: number;
  declare unit_price: number;

  declare characterId: ForeignKey<EsiCharacter['characterId']>;

  declare getEsiCharacter: BelongsToGetAssociationMixin<EsiCharacter | null>;
}

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
    },
    {
      sequelize,
      modelName: WalletTransaction.name,
      tableName: 'wallet_transactions',
      timestamps: false,
    },
  );