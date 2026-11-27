import { DataTypes, Model, Sequelize } from 'sequelize';

/** Where an account buys and sells. One row per account; missing means the defaults. */
export class TradeSettings extends Model {
  declare accountId: number;
  declare buy_location_id: number;
  declare sell_location_id: number;
}

export const tradeSettingsModelDefine = (sequelize: Sequelize) =>
  TradeSettings.init(
    {
      accountId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      buy_location_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      sell_location_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: TradeSettings.name,
      tableName: 'app_trade_settings',
      timestamps: false,
    },
  );
