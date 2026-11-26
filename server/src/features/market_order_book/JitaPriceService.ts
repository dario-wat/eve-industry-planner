import { QueryTypes } from 'sequelize';
import { Service } from 'typedi';
import { JITA_4_4 } from '../../const/IDs';
import { MarketOrderOpen } from './MarketOrderOpen';

export type BestPrices = { buy: number | null; sell: number | null };
type PriceRow = BestPrices & { type_id: number };

@Service()
export default class JitaPriceService {

  /**
   * Highest buy and lowest sell order at Jita 4-4 in the stored order book.
   * Types without orders there are absent.
   */
  public async genxBestPrices(typeIds: readonly number[]): Promise<Map<number, BestPrices>> {
    const prices = new Map<number, BestPrices>();
    const sequelize = MarketOrderOpen.sequelize;
    if (typeIds.length === 0 || sequelize === undefined) {
      return prices;
    }
    const rows = await sequelize.query<PriceRow>(
      `SELECT type_id,
        MAX(CASE WHEN is_buy THEN price END) AS buy,
        MIN(CASE WHEN NOT is_buy THEN price END) AS sell
      FROM ${MarketOrderOpen.tableName}
      WHERE location_id = :location AND NOT missing AND type_id IN (:typeIds)
      GROUP BY type_id`,
      {
        replacements: { location: JITA_4_4, typeIds: [...new Set(typeIds)] },
        type: QueryTypes.SELECT,
      },
    );
    for (const row of rows) {
      prices.set(row.type_id, { buy: row.buy, sell: row.sell });
    }
    return prices;
  }
}
