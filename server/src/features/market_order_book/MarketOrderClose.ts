import { DataTypes, Model, Sequelize } from 'sequelize';

export type MarketOrderCloseStatus = 'pending' | 'reappeared' | 'expired' | 'ambiguous';

/**
 * One row per time an order went missing. The evidence describes the poll that
 * first missed it against the poll before, for the same type and location.
 * outcome, score, reason, and rule_version stay null until classified.
 */
export class MarketOrderClose extends Model {
  declare order_id: number;
  declare first_missed_at: Date;
  declare status: MarketOrderCloseStatus;
  declare resolved_at: Date | null;
  /** Newest change stored for this book before the miss. */
  declare book_changed_at: Date | null;
  declare type_id: number;
  declare location_id: number;
  declare is_buy: boolean;
  declare price: number;
  declare volume_remain: number;
  declare volume_total: number;
  declare min_volume: number;
  declare range: string;
  declare issued: Date;
  declare duration: number;
  declare better_orders_before: number;
  declare better_volume_before: number;
  declare best_price_after: number | null;
  declare best_opposite_price_after: number | null;
  /** Best strictly better order that both polls list unchanged. */
  declare survivor_order_id: number | null;
  declare survivor_price: number | null;
  /** New order sized within 5% of what was left on this one. */
  declare relist_order_id: number | null;
  declare relist_price: number | null;
  declare relist_volume: number | null;
  declare poll_traded_volume: number;
  declare nearest_traded_price: number | null;
  declare poll_missed_count: number;
  declare outcome: string | null;
  declare score: number | null;
  declare reason: string | null;
  declare rule_version: number | null;
}

export const marketOrderCloseModelDefine = (sequelize: Sequelize) =>
  MarketOrderClose.init(
    {
      order_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
      },
      first_missed_at: {
        type: DataTypes.DATE,
        primaryKey: true,
      },
      status: DataTypes.STRING(16),
      resolved_at: DataTypes.DATE,
      book_changed_at: DataTypes.DATE,
      type_id: DataTypes.INTEGER,
      location_id: DataTypes.BIGINT,
      is_buy: DataTypes.BOOLEAN,
      price: DataTypes.DOUBLE,
      volume_remain: DataTypes.BIGINT,
      volume_total: DataTypes.BIGINT,
      min_volume: DataTypes.BIGINT,
      range: DataTypes.STRING(16),
      issued: DataTypes.DATE,
      duration: DataTypes.INTEGER,
      better_orders_before: DataTypes.INTEGER,
      better_volume_before: DataTypes.BIGINT,
      best_price_after: DataTypes.DOUBLE,
      best_opposite_price_after: DataTypes.DOUBLE,
      survivor_order_id: DataTypes.BIGINT,
      survivor_price: DataTypes.DOUBLE,
      relist_order_id: DataTypes.BIGINT,
      relist_price: DataTypes.DOUBLE,
      relist_volume: DataTypes.BIGINT,
      poll_traded_volume: DataTypes.BIGINT,
      nearest_traded_price: DataTypes.DOUBLE,
      poll_missed_count: DataTypes.INTEGER,
      outcome: DataTypes.STRING(16),
      score: DataTypes.DOUBLE,
      reason: DataTypes.STRING(64),
      rule_version: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: MarketOrderClose.name,
      tableName: 'derived_market_order_close',
      timestamps: false,
      indexes: [
        { fields: ['first_missed_at'] },
      ],
    },
  );
