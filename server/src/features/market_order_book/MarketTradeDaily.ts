import { DataTypes, Model, Sequelize } from 'sequelize';

/**
 * Per UTC day, type, and side: volume seen leaving Jita and Perimeter orders.
 * traded_* is volume_remain going down on an order still listed.
 * closed_* is the volume left on orders that vanished before they expired:
 * filled or cancelled, the book cannot tell which.
 */
export class MarketTradeDaily extends Model {
  declare day: string;
  declare type_id: number;
  declare is_buy: boolean;
  declare traded_volume: number;
  declare traded_isk: number;
  declare min_price: number | null;
  declare max_price: number | null;
  declare fill_count: number;
  declare closed_volume: number;
  declare closed_isk: number;
  declare closed_count: number;
}

export const marketTradeDailyModelDefine = (sequelize: Sequelize) =>
  MarketTradeDaily.init(
    {
      day: {
        type: DataTypes.DATEONLY,
        primaryKey: true,
      },
      type_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      is_buy: {
        type: DataTypes.BOOLEAN,
        primaryKey: true,
      },
      traded_volume: DataTypes.BIGINT,
      traded_isk: DataTypes.DOUBLE,
      min_price: DataTypes.DOUBLE,
      max_price: DataTypes.DOUBLE,
      fill_count: DataTypes.INTEGER,
      closed_volume: DataTypes.BIGINT,
      closed_isk: DataTypes.DOUBLE,
      closed_count: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: MarketTradeDaily.name,
      tableName: 'derived_market_trade_daily',
      timestamps: false,
    },
  );
