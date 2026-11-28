import { QueryTypes } from 'sequelize';
import { Service } from 'typedi';
import {
  ActivityKind,
  TradeActivityEventRes,
  TradeActivityRes,
  TradeActivityStationRes,
} from '@internal/shared';
import ActorContext from '../../core/actor_context/ActorContext';
import { MarketOrderEvent } from './MarketOrderEvent';
import TradeSettingsService from '../trade_settings/TradeSettingsService';
import LocationNameService from '../fees/LocationNameService';
import { activityDays, ActivityDayRow, utcDayStart } from './activityDays';

export const ACTIVITY_DAYS = 30;
const RECENT_EVENTS = 50;
const KINDS: ActivityKind[] = ['repriced', 'appeared', 'traded'];

type StationRow = {
  location_id: number;
  is_buy: number;
  kind: ActivityKind;
  n: number;
  orders: number;
  units: number;
};

type EventRow = {
  observed_at: Date | string;
  kind: 'repriced' | 'appeared';
  order_id: number;
  location_id: number;
  is_buy: number;
  price: number;
  previous_price: number | null;
};

@Service()
export default class TradeActivityService {

  constructor(
    private readonly tradeSettingsService: TradeSettingsService,
    private readonly locationNameService: LocationNameService,
  ) { }

  public async genxActivity(actorContext: ActorContext, typeId: number): Promise<TradeActivityRes> {
    const sequelize = MarketOrderEvent.sequelize!;
    const table = MarketOrderEvent.tableName;
    const now = new Date();
    const since = new Date(utcDayStart(now).getTime() - (ACTIVITY_DAYS - 1) * 86_400_000);
    const { sellLocationId } = await this.tradeSettingsService.genxStations(actorContext);
    const select = <T extends object>(sql: string, replacements: Record<string, unknown>) =>
      sequelize.query<T>(sql, { replacements, type: QueryTypes.SELECT });

    const [dayRows, stationRows, eventRows] = await Promise.all([
      // Sell orders compete only at the sell station; buy orders anywhere in the book can.
      select<ActivityDayRow>(
        `SELECT DATE_FORMAT(observed_at, '%Y-%m-%d') AS day, is_buy, kind,
          COUNT(*) AS n, COALESCE(SUM(volume_delta), 0) AS units
        FROM ${table}
        WHERE type_id = :typeId AND observed_at >= :since AND kind IN (:kinds)
          AND (is_buy OR location_id = :sell)
        GROUP BY day, is_buy, kind`,
        { typeId, since, kinds: KINDS, sell: sellLocationId },
      ),
      select<StationRow>(
        `SELECT location_id, is_buy, kind, COUNT(*) AS n, COUNT(DISTINCT order_id) AS orders,
          COALESCE(SUM(volume_delta), 0) AS units
        FROM ${table}
        WHERE type_id = :typeId AND observed_at >= :from AND kind IN (:kinds)
        GROUP BY location_id, is_buy, kind`,
        { typeId, from: new Date(now.getTime() - 86_400_000), kinds: KINDS },
      ),
      select<EventRow>(
        `SELECT observed_at, kind, order_id, location_id, is_buy, price, previous_price
        FROM ${table}
        WHERE type_id = :typeId AND observed_at >= :since AND kind IN ('repriced', 'appeared')
        ORDER BY observed_at DESC, id DESC
        LIMIT ${RECENT_EVENTS}`,
        { typeId, since },
      ),
    ]);

    const names = await this.locationNameService.genShortNames(actorContext, [
      sellLocationId,
      ...stationRows.map((row) => Number(row.location_id)),
      ...eventRows.map((row) => Number(row.location_id)),
    ]);
    const name = (locationId: number) => names[locationId] ?? null;

    return {
      sellLocationId,
      sellLocationName: name(sellLocationId),
      days: activityDays(dayRows, now, ACTIVITY_DAYS),
      last24h: this.stations(stationRows, name),
      recent: eventRows.map((row): TradeActivityEventRes => ({
        observedAt: new Date(row.observed_at).toISOString(),
        kind: row.kind,
        orderId: Number(row.order_id),
        locationName: name(Number(row.location_id)),
        isBuy: Boolean(row.is_buy),
        price: row.price,
        previousPrice: row.previous_price,
      })),
    };
  }

  private stations(
    rows: StationRow[],
    name: (locationId: number) => string | null,
  ): TradeActivityStationRes[] {
    const byKey = new Map<string, TradeActivityStationRes>();
    for (const row of rows) {
      const locationId = Number(row.location_id);
      const isBuy = Boolean(row.is_buy);
      const key = `${locationId}:${isBuy}`;
      const station = byKey.get(key) ?? {
        locationId,
        locationName: name(locationId),
        isBuy,
        repriced: 0,
        repricingOrders: 0,
        appeared: 0,
        unitsTraded: 0,
      };
      if (row.kind === 'repriced') {
        station.repriced = Number(row.n);
        station.repricingOrders = Number(row.orders);
      } else if (row.kind === 'appeared') {
        station.appeared = Number(row.n);
      } else {
        station.unitsTraded = Number(row.units);
      }
      byKey.set(key, station);
    }
    return [...byKey.values()].sort((a, b) => b.repriced - a.repriced);
  }
}
