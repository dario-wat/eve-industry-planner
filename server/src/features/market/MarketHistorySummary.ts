import { DataTypes, Model, Sequelize } from 'sequelize';

export class MarketHistorySummary extends Model {
  declare region_id: number;
  declare type_id: number;
  declare window_days: number;
  declare median_price: number | null;
  declare price_change: number | null;
  declare median_units: number;
  declare median_isk: number;
  declare median_orders: number;
  declare days_traded: number;
  declare median_range: number | null;
  declare isk_weighted_range: number | null;
  declare median_price_in_range: number | null;
  declare as_of_date: string;
}

export const marketHistorySummaryModelDefine = (sequelize: Sequelize) =>
  MarketHistorySummary.init(
    {
      region_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      type_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      window_days: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      median_price: DataTypes.DOUBLE,
      price_change: DataTypes.DOUBLE,
      median_units: DataTypes.DOUBLE,
      median_isk: DataTypes.DOUBLE,
      median_orders: DataTypes.DOUBLE,
      days_traded: DataTypes.INTEGER,
      median_range: DataTypes.DOUBLE,
      isk_weighted_range: DataTypes.DOUBLE,
      median_price_in_range: DataTypes.DOUBLE,
      as_of_date: DataTypes.DATEONLY,
    },
    {
      sequelize,
      modelName: MarketHistorySummary.name,
      tableName: 'market_history_summary',
      timestamps: false,
    },
  );
