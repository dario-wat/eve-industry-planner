import assert from 'node:assert/strict';
import { test } from 'node:test';
import { brokerFee, relistFee } from '@internal/shared';
import {
  feeRates,
  npcBrokerRate,
  relistDiscount,
  salesTaxRate,
  structureBrokerRate,
  Trader,
} from './fees';

const CALDARI_NAVY = 1000035;
const CALDARI_STATE = 500001;
const JITA_4_4 = {
  kind: 'npc_station',
  corporationId: CALDARI_NAVY,
  factionId: CALDARI_STATE,
} as const;

function close(actual: number, expected: number): void {
  assert.ok(
    Math.abs(actual - expected) <= 1e-12 * Math.max(1, Math.abs(expected)),
    `${actual} is not ${expected}`,
  );
}

function trader(overrides: {
  brokerRelations?: number;
  accounting?: number;
  advancedBrokerRelations?: number;
  corporations?: [number, number][];
  factions?: [number, number][];
} = {}): Trader {
  return {
    skills: {
      brokerRelations: overrides.brokerRelations ?? 0,
      accounting: overrides.accounting ?? 0,
      advancedBrokerRelations: overrides.advancedBrokerRelations ?? 0,
    },
    standings: {
      byCorporation: new Map(overrides.corporations ?? []),
      byFaction: new Map(overrides.factions ?? []),
    },
  };
}

test('NPC broker rate starts at 3% and drops 0.3% per Broker Relations level', () => {
  close(npcBrokerRate(0, 0, 0), 0.03);
  close(npcBrokerRate(5, 0, 0), 0.015);
});

test('NPC broker rate uses faction and corporation standing', () => {
  close(npcBrokerRate(5, 10, 0), 0.012);
  close(npcBrokerRate(5, 0, 10), 0.013);
  close(npcBrokerRate(5, -5, -5), 0.0175);
});

test('NPC broker rate floors at 1%', () => {
  close(npcBrokerRate(5, 10, 10), 0.01);
});

test('structure broker rate is the SCC 0.5% plus the owner rate, whatever the skills', () => {
  close(structureBrokerRate(0), 0.005);
  close(structureBrokerRate(0.01), 0.015);
  const rates = feeRates(trader({ brokerRelations: 5 }), { kind: 'structure', ownerBrokerRate: 0 });
  close(rates.brokerRate, 0.005);
});

test('sales tax is 7.5% less 11% per Accounting level', () => {
  close(salesTaxRate(0), 0.075);
  close(salesTaxRate(5), 0.03375);
});

test('relist discount is 50% plus 6% per Advanced Broker Relations level', () => {
  close(relistDiscount(0), 0.5);
  close(relistDiscount(5), 0.8);
});

test('fee rates at Jita 4-4 read Caldari Navy and Caldari State standings', () => {
  const rates = feeRates(
    trader({
      brokerRelations: 5,
      accounting: 4,
      advancedBrokerRelations: 3,
      corporations: [[CALDARI_NAVY, 2], [1000125, 10]],
      factions: [[CALDARI_STATE, 3], [500002, 10]],
    }),
    JITA_4_4,
  );
  close(rates.brokerRate, 0.03 - 0.015 - 0.0009 - 0.0004);
  close(rates.salesTaxRate, 0.075 * (1 - 0.44));
  close(rates.relistDiscount, 0.68);
});

test('a station corporation without a faction counts only corporation standing', () => {
  const rates = feeRates(
    trader({ corporations: [[1000001, 5]], factions: [[CALDARI_STATE, 10]] }),
    { kind: 'npc_station', corporationId: 1000001, factionId: null },
  );
  close(rates.brokerRate, 0.029);
  assert.equal(rates.sccSurchargeRate, 0);
});

test('broker fee has a 100 ISK minimum', () => {
  const rates = feeRates(trader({ brokerRelations: 5 }), JITA_4_4);
  close(brokerFee(rates, 1_000_000), 15_000);
  assert.equal(brokerFee(rates, 1000), 100);
});

test('relist fee charges the undiscounted share on the full new value', () => {
  const rates = feeRates(trader({ brokerRelations: 5, advancedBrokerRelations: 5 }), JITA_4_4);
  close(relistFee(rates, 1_000_000_000, 999_000_000), 0.2 * 0.015 * 999_000_000);
});

test('relist fee adds the full broker fee on a raise', () => {
  const rates = feeRates(trader({ brokerRelations: 5, advancedBrokerRelations: 5 }), JITA_4_4);
  close(
    relistFee(rates, 1_000_000_000, 1_100_000_000),
    0.2 * 0.015 * 1_100_000_000 + 0.015 * 100_000_000,
  );
});

test('in a structure the minimum applies only to the owner share', () => {
  const rates = feeRates(trader(), { kind: 'structure', ownerBrokerRate: 0 });
  close(brokerFee(rates, 480_600_000), 2_403_000 + 100);
  close(brokerFee(rates, 1000), 5 + 100);
});

test('relist fee has a 100 ISK minimum', () => {
  const rates = feeRates(trader({ brokerRelations: 5, advancedBrokerRelations: 5 }), JITA_4_4);
  assert.equal(relistFee(rates, 10_000, 10_000), 100);
});
