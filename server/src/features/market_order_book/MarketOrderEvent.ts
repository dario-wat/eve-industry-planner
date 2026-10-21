import { DataTypes, Model, Sequelize } from 'sequelize';

export class MarketOrderEvent extends Model {
  declare id: number;
  declare region_id: number;
  declare observed_at: Date;
  declare kind: string;
  declare order_id: number;
  declare type_id: number;
  declare location_id: number;
  declare is_buy: boolean;
  declare price: number;
  declare previous_price: number | null;
  declare volume_remain: number;
  declare previous_volume_remain: number | null;
  declare volume_delta: number | null;
}

export const marketOrderEventModelDefine = (sequelize: Sequelize) =>
  MarketOrderEvent.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      region_id: DataTypes.INTEGER,
      observed_at: DataTypes.DATE,
      kind: DataTypes.STRING,
      order_id: DataTypes.BIGINT,
      type_id: DataTypes.INTEGER,
      location_id: DataTypes.BIGINT,
      is_buy: DataTypes.BOOLEAN,
      price: DataTypes.DOUBLE,
      previous_price: {
        type: DataTypes.DOUBLE,
        allowNull: true,
      },
      volume_remain: DataTypes.BIGINT,
      previous_volume_remain: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      volume_delta: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: MarketOrderEvent.name,
      tableName: 'market_order_event',
      timestamps: false,
      indexes: [
        { fields: ['region_id', 'observed_at'] },
        { fields: ['order_id'] },
      ],
    },
  );
