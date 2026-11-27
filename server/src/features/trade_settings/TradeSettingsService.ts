import { Service } from 'typedi';
import { TradeLocationRes, TradeSettingsRes } from '@internal/shared';
import ActorContext from '../../core/actor_context/ActorContext';
import StationService from '../../core/query/StationService';
import {
  JITA_4_4,
  PERIMETER,
  PERIMETER_MARKET_STRUCTURES,
  TRADE_LOCATIONS,
} from '../../const/IDs';
import EveSdeData from '../../core/sde/EveSdeData';
import { TradeSettings } from './TradeSettings';

export type TradeStations = {
  buyLocationId: number;
  sellLocationId: number;
};

const DEFAULT_STATIONS: TradeStations = {
  buyLocationId: PERIMETER_MARKET_STRUCTURES[0],
  sellLocationId: JITA_4_4,
};

@Service()
export default class TradeSettingsService {

  constructor(
    private readonly stationService: StationService,
    private readonly sdeData: EveSdeData,
  ) { }

  /** The saved stations, or the defaults where none is saved or one is no longer offered. */
  public async genxStations(actorContext: ActorContext): Promise<TradeStations> {
    const row = await TradeSettings.findByPk(actorContext.accountId!);
    const offered = (locationId: number | undefined, fallback: number) =>
      locationId !== undefined && TRADE_LOCATIONS.includes(Number(locationId))
        ? Number(locationId)
        : fallback;
    return {
      buyLocationId: offered(row?.buy_location_id, DEFAULT_STATIONS.buyLocationId),
      sellLocationId: offered(row?.sell_location_id, DEFAULT_STATIONS.sellLocationId),
    };
  }

  public async genxSettings(actorContext: ActorContext): Promise<TradeSettingsRes> {
    const [stations, locations] = await Promise.all([
      this.genxStations(actorContext),
      this.genxLocations(actorContext),
    ]);
    return { ...stations, locations };
  }

  public async genxSave(actorContext: ActorContext, stations: TradeStations): Promise<void> {
    await TradeSettings.upsert({
      accountId: actorContext.accountId!,
      buy_location_id: stations.buyLocationId,
      sell_location_id: stations.sellLocationId,
    });
  }

  /** Every station the settings offer, named through any logged-in character that can see it. */
  public async genxLocations(actorContext: ActorContext): Promise<TradeLocationRes[]> {
    const names = await this.stationService.genAllStationNames(actorContext, [...TRADE_LOCATIONS]);
    return TRADE_LOCATIONS.map((locationId) => ({
      locationId,
      systemId: this.systemId(locationId),
      name: names[locationId] ?? null,
    }));
  }

  /** The Perimeter structures are not in the SDE. */
  private systemId(locationId: number): number {
    return PERIMETER_MARKET_STRUCTURES.includes(locationId)
      ? PERIMETER
      : this.sdeData.stations[locationId].solar_system_id;
  }
}

export function isTradeLocation(value: unknown): value is number {
  return typeof value === 'number' && TRADE_LOCATIONS.includes(value);
}
