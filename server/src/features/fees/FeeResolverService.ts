import { Service } from 'typedi';
import EveSdeData from '../../core/sde/EveSdeData';
import { PERIMETER_MARKET_STRUCTURES } from '../../const/IDs';
import { FeeRates } from '@internal/shared';
import { feeRates, Trader, TradeLocation } from './fees';

/** Owner broker rates (without the SCC surcharge). No ESI endpoint exposes them. */
const STRUCTURE_OWNER_BROKER_RATES: ReadonlyMap<number, number> = new Map(
  PERIMETER_MARKET_STRUCTURES.map((structureId) => [structureId, 0]),
);

@Service()
export default class FeeResolverService {

  constructor(
    private readonly sdeData: EveSdeData,
  ) { }

  /** Null for a station missing from the SDE or a structure without a recorded owner rate. */
  public tradeLocation(locationId: number): TradeLocation | null {
    const ownerBrokerRate = STRUCTURE_OWNER_BROKER_RATES.get(locationId);
    if (ownerBrokerRate !== undefined) {
      return { kind: 'structure', ownerBrokerRate };
    }
    const corporationId = this.sdeData.stations[locationId]?.owner_id;
    if (corporationId === undefined || corporationId === null) {
      return null;
    }
    return {
      kind: 'npc_station',
      corporationId,
      factionId: this.sdeData.npcCorporations[corporationId]?.faction_id ?? null,
    };
  }

  public feeRates(trader: Trader, locationId: number): FeeRates | null {
    const location = this.tradeLocation(locationId);
    return location === null ? null : feeRates(trader, location);
  }
}
