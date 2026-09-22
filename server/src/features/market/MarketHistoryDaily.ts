import { DataTypes, Model, Sequelize } from 'sequelize';

export class MarketHistoryDaily extends Model {
  declare region_id: number;
  declare type_id: number;
  declare date: string;
  declare average: number;
  declare highest: number;
  declare lowest: number;
  declare order_count: number;
  declare volume: number;
}

export const marketHistoryDailyModelDefine = (sequelize: Sequelize) =>
  MarketHistoryDaily.init(
    {
      region_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      type_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      date: {
        type: DataTypes.DATEONLY,
        primaryKey: true,
      },
      average: DataTypes.DOUBLE,
      highest: DataTypes.DOUBLE,
      lowest: DataTypes.DOUBLE,
      order_count: DataTypes.INTEGER,
      volume: DataTypes.BIGINT,
    },
    {
      sequelize,
      modelName: MarketHistoryDaily.name,
      tableName: 'market_history_daily',
      timestamps: false,
    },
  );
