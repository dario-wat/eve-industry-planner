import type { EsiSkill, EsiStanding } from 'eve-esi';
import {
  ACCOUNTING,
  ADVANCED_BROKER_RELATIONS,
  BROKER_RELATIONS,
  RETAIL,
  TRADE,
  TYCOON,
  WHOLESALE,
} from '../../const/Skills';

const BASE_ORDER_SLOTS = 5;
const ORDER_SLOTS_PER_LEVEL: readonly [skillId: number, slots: number][] = [
  [TRADE, 4],
  [RETAIL, 8],
  [WHOLESALE, 16],
  [TYCOON, 32],
];

export type TradeSkills = {
  accounting: number;
  brokerRelations: number;
  advancedBrokerRelations: number;
};

/** Unmodified standings. An entity the character has no standing with is absent: use 0. */
export type NpcStandings = {
  byCorporation: ReadonlyMap<number, number>;
  byFaction: ReadonlyMap<number, number>;
};

export function tradeSkills(skills: readonly EsiSkill[]): TradeSkills {
  return {
    accounting: activeLevel(skills, ACCOUNTING),
    brokerRelations: activeLevel(skills, BROKER_RELATIONS),
    advancedBrokerRelations: activeLevel(skills, ADVANCED_BROKER_RELATIONS),
  };
}

export function orderSlots(skills: readonly EsiSkill[]): number {
  return ORDER_SLOTS_PER_LEVEL.reduce(
    (total, [skillId, slots]) => total + slots * activeLevel(skills, skillId),
    BASE_ORDER_SLOTS,
  );
}

export function npcStandings(standings: readonly EsiStanding[]): NpcStandings {
  const ofType = (type: EsiStanding['from_type']): Map<number, number> =>
    new Map(standings
      .filter((standing) => standing.from_type === type)
      .map((standing) => [standing.from_id, standing.standing]));
  return { byCorporation: ofType('npc_corp'), byFaction: ofType('faction') };
}

function activeLevel(skills: readonly EsiSkill[], skillId: number): number {
  return skills.find((skill) => skill.skill_id === skillId)?.active_skill_level ?? 0;
}
