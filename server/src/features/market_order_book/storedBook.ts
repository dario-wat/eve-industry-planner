import { Op } from 'sequelize';
import { TradeBookOrderRes } from '@internal/shared';
import { MarketOrderOpen } from './MarketOrderOpen';

export type StoredBook = { orders: TradeBookOrderRes[]; observedAt: string | null };

/** Open orders in the stored book (Jita and the Perimeter structures) for these types. */
export async function genStoredBook(typeIds: number[]): Promise<StoredBook> {
  if (typeIds.length === 0) {
    return { orders: [], observedAt: null };
  }
  const rows = await MarketOrderOpen.findAll({
    where: { type_id: { [Op.in]: typeIds }, missing: false },
    raw: true,
  });
  const observedAt = rows.reduce<number | null>((latest, row) => {
    const time = new Date(row.observed_at).getTime();
    return latest === null || time > latest ? time : latest;
  }, null);
  return {
    observedAt: observedAt === null ? null : new Date(observedAt).toISOString(),
    orders: rows.map((row) => ({
      orderId: Number(row.order_id),
      typeId: Number(row.type_id),
      locationId: Number(row.location_id),
      systemId: row.system_id,
      isBuy: Boolean(row.is_buy),
      price: row.price,
      volumeRemain: Number(row.volume_remain),
      minVolume: Number(row.min_volume),
      range: row.range,
      issued: new Date(row.issued).toISOString(),
    })),
  };
}
