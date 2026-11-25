import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { EsiMarketOrder, EsiSkill } from 'eve-esi';
import { npcStandings, orderSlots, orderValues, tradeSkills } from './characterTrading';

function skill(skillId: number, active: number, trained: number = active): EsiSkill {
  return {
    skill_id: skillId,
    active_skill_level: active,
    trained_skill_level: trained,
    skillpoints_in_skill: 0,
  };
}

function order(overrides: Partial<EsiMarketOrder>): EsiMarketOrder {
  return {
    duration: 90,
    is_corporation: false,
    issued: '2026-01-01T00:00:00Z',
    location_id: 60003760,
    order_id: 1,
    price: 10,
    range: 'station',
    region_id: 10000002,
    type_id: 34,
    volume_remain: 5,
    volume_total: 100,
    ...overrides,
  };
}

test('order values use the remaining volume and skip corporation orders', () => {
  assert.deepEqual(
    orderValues([
      order({ is_buy_order: true }),
      order({ is_buy_order: false, price: 3 }),
      order({ price: 2 }),
      order({ is_buy_order: true, is_corporation: true }),
    ]),
    { buy: 50, sell: 25 },
  );
});

test('an untrained character has five order slots', () => {
  assert.equal(orderSlots([]), 5);
});

test('a fully trained character has 305 order slots', () => {
  assert.equal(
    orderSlots([skill(3443, 5), skill(3444, 5), skill(16596, 5), skill(18580, 5)]),
    305,
  );
});

test('order slots add up per skill level', () => {
  assert.equal(
    orderSlots([skill(3443, 4), skill(3444, 3), skill(16596, 2), skill(18580, 1)]),
    5 + 16 + 24 + 32 + 32,
  );
});

test('levels are the active ones, and missing skills are 0', () => {
  assert.deepEqual(tradeSkills([skill(16622, 3, 5), skill(3446, 4)]), {
    accounting: 3,
    brokerRelations: 4,
    advancedBrokerRelations: 0,
  });
  assert.equal(orderSlots([skill(3443, 2, 5)]), 13);
});

test('standings split by corporation and faction, without agents', () => {
  const standings = npcStandings([
    { from_id: 1000035, from_type: 'npc_corp', standing: 4.5 },
    { from_id: 500001, from_type: 'faction', standing: -1.2 },
    { from_id: 3008416, from_type: 'agent', standing: 9 },
  ]);
  assert.deepEqual([...standings.byCorporation], [[1000035, 4.5]]);
  assert.deepEqual([...standings.byFaction], [[500001, -1.2]]);
});
