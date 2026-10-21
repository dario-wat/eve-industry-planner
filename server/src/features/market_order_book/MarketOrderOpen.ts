import { DataTypes, Model, Sequelize } from 'sequelize';

export class MarketOrderOpen extends Model {
  declare order_id: number;
  declare region_id: number;
  declare type_id: number;
  declare location_id: number;
  declare system_id: number;
  declare is_buy: boolean;
  declare price: number;
  declare volume_remain: number;
  declare volume_total: number;
  declare min_volume: number;
  declare range: string;
  declare issued: Date;
  declare duration: number;
  declare missing: boolean;
  declare observed_at: Date;
}

export const marketOrderOpenModelDefine = (sequelize: Sequelize) =>
  MarketOrderOpen.init(
    {
      order_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
      },
      region_id: DataTypes.INTEGER,
      type_id: DataTypes.INTEGER,
      location_id: DataTypes.BIGINT,
      system_id: DataTypes.INTEGER,
      is_buy: DataTypes.BOOLEAN,
      price: DataTypes.DOUBLE,
      volume_remain: DataTypes.BIGINT,
      volume_total: DataTypes.BIGINT,
      min_volume: DataTypes.BIGINT,
      range: DataTypes.STRING,
      issued: DataTypes.DATE,
      duration: DataTypes.INTEGER,
      missing: DataTypes.BOOLEAN,
      observed_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: MarketOrderOpen.name,
      tableName: 'market_order_open',
      timestamps: false,
      indexes: [
        { fields: ['region_id'] },
      ],
    },
  );
