import { NpcStandings, TradeSkills } from '../character_context/characterTrading';

export type FeeRates = {
  brokerRate: number;
  salesTaxRate: number;
  /** Share of the broker fee waived on every relist (modify order). */
  relistDiscount: number;
};

export type TradeLocation =
  | { kind: 'npc_station'; corporationId: number; factionId: number | null }
  | { kind: 'structure'; ownerBrokerRate: number };

export type Trader = {
  skills: TradeSkills;
  standings: NpcStandings;
};

export const MIN_BROKER_FEE = 100;

const NPC_BROKER_BASE = 0.03;
const NPC_BROKER_PER_BROKER_RELATIONS = 0.003;
const NPC_BROKER_PER_FACTION_STANDING = 0.0003;
const NPC_BROKER_PER_CORPORATION_STANDING = 0.0002;
const NPC_BROKER_FLOOR = 0.01;
const SCC_SURCHARGE = 0.005;
const SALES_TAX_BASE = 0.075;
const SALES_TAX_CUT_PER_ACCOUNTING = 0.11;
const RELIST_DISCOUNT_BASE = 0.5;
const RELIST_DISCOUNT_PER_ADVANCED_BROKER_RELATIONS = 0.06;

/** Standings are the unmodified ones: Connections and Diplomacy do not lower fees. */
export function npcBrokerRate(
  brokerRelations: number,
  factionStanding: number,
  corporationStanding: number,
): number {
  return Math.max(
    NPC_BROKER_FLOOR,
    NPC_BROKER_BASE
      - NPC_BROKER_PER_BROKER_RELATIONS * brokerRelations
      - NPC_BROKER_PER_FACTION_STANDING * factionStanding
      - NPC_BROKER_PER_CORPORATION_STANDING * corporationStanding,
  );
}

/** Broker Relations and standings do not apply in player structures. */
export function structureBrokerRate(ownerBrokerRate: number): number {
  return SCC_SURCHARGE + ownerBrokerRate;
}

export function salesTaxRate(accounting: number): number {
  return SALES_TAX_BASE * (1 - SALES_TAX_CUT_PER_ACCOUNTING * accounting);
}

export function relistDiscount(advancedBrokerRelations: number): number {
  return RELIST_DISCOUNT_BASE
    + RELIST_DISCOUNT_PER_ADVANCED_BROKER_RELATIONS * advancedBrokerRelations;
}

export function feeRates(trader: Trader, location: TradeLocation): FeeRates {
  const { skills, standings } = trader;
  const brokerRate = location.kind === 'structure'
    ? structureBrokerRate(location.ownerBrokerRate)
    : npcBrokerRate(
      skills.brokerRelations,
      location.factionId === null ? 0 : standings.byFaction.get(location.factionId) ?? 0,
      standings.byCorporation.get(location.corporationId) ?? 0,
    );
  return {
    brokerRate,
    salesTaxRate: salesTaxRate(skills.accounting),
    relistDiscount: relistDiscount(skills.advancedBrokerRelations),
  };
}

export function brokerFee(rates: FeeRates, orderValue: number): number {
  return Math.max(MIN_BROKER_FEE, rates.brokerRate * orderValue);
}

/** Charged on the whole new order value on every relist, plus full broker fee on any raise. */
export function relistFee(rates: FeeRates, oldOrderValue: number, newOrderValue: number): number {
  return Math.max(
    MIN_BROKER_FEE,
    (1 - rates.relistDiscount) * rates.brokerRate * newOrderValue
      + rates.brokerRate * Math.max(newOrderValue - oldOrderValue, 0),
  );
}
