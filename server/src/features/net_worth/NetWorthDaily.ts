import { DataTypes, Model, Sequelize } from 'sequelize';

/** One snapshot per UTC day and character. A second run on the same day replaces it. */
export class NetWorthDaily extends Model {
  declare day: string;
  declare character_id: number;
  declare wallet: number;
  declare buy_orders: number;
  declare sell_orders: number;
  declare assets_buy: number;
  declare assets_sell: number;
  declare recorded_at: Date;
}

export const netWorthDailyModelDefine = (sequelize: Sequelize) =>
  NetWorthDaily.init(
    {
      day: {
        type: DataTypes.DATEONLY,
        primaryKey: true,
      },
      character_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      wallet: DataTypes.DOUBLE,
      buy_orders: DataTypes.DOUBLE,
      sell_orders: DataTypes.DOUBLE,
      assets_buy: DataTypes.DOUBLE,
      assets_sell: DataTypes.DOUBLE,
      recorded_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: NetWorthDaily.name,
      tableName: 'derived_character_net_worth_daily',
      timestamps: false,
      indexes: [
        { fields: ['character_id', 'day'] },
      ],
    },
  );
