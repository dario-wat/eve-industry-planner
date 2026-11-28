import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { TradeBookOrderRes } from './api';
import { buyOrderReaches, competingOrders, orderStanding, tradeHubJumps } from './orderBook';

const JITA = 30000142;
const PERIMETER = 30000144;
const JITA_4_4 = { locationId: 60003760, systemId: JITA };
const OTHER_JITA_STATION = 60003757;
const NEUTRAL_STATES_HQ = { locationId: 1044752365771, systemId: PERIMETER };

let nextOrderId = 1;

function order(overrides: Partial<TradeBookOrderRes>): TradeBookOrderRes {
  return {
    orderId: nextOrderId++,
    typeId: 34,
    locationId: JITA_4_4.locationId,
    systemId: JITA,
    isBuy: true,
    price: 100,
    volumeRemain: 10,
    minVolume: 1,
    range: 'station',
    issued: '2026-11-01T00:00:00Z',
    ...overrides,
  };
}

test('Jita and Perimeter are one jump apart, other systems are unknown', () => {
  assert.equal(tradeHubJumps(JITA, JITA), 0);
  assert.equal(tradeHubJumps(JITA, PERIMETER), 1);
  assert.equal(tradeHubJumps(PERIMETER, JITA), 1);
  assert.equal(tradeHubJumps(JITA, 30000145), null);
});

test('buy order range decides which stations can sell into it', () => {
  const stationOnly = order({ range: 'station' });
  assert.ok(buyOrderReaches(stationOnly, JITA_4_4));
  assert.ok(!buyOrderReaches(stationOnly, { locationId: OTHER_JITA_STATION, systemId: JITA }));

  const system = order({ range: 'solarsystem', locationId: OTHER_JITA_STATION });
  assert.ok(buyOrderReaches(system, JITA_4_4));
  assert.ok(!buyOrderReaches(system, NEUTRAL_STATES_HQ));

  assert.ok(buyOrderReaches(order({ range: '1' }), NEUTRAL_STATES_HQ));
  assert.ok(!buyOrderReaches(order({ range: '1' }), { locationId: 1, systemId: 30000145 }));
  assert.ok(buyOrderReaches(order({ range: 'region' }), { locationId: 1, systemId: 30000145 }));
});

test('competing buy orders include ranged orders from elsewhere, best price first', () => {
  const book = [
    order({ price: 90, range: 'station' }),
    order({ price: 95, range: '5' }),
    order({ price: 99, range: 'station' }),
    order({ price: 97, locationId: NEUTRAL_STATES_HQ.locationId, systemId: PERIMETER }),
    order({ price: 120, isBuy: false }),
  ];
  assert.deepEqual(competingOrders(book, NEUTRAL_STATES_HQ, 'buy').map((o) => o.price), [97, 95]);
  assert.deepEqual(competingOrders(book, JITA_4_4, 'buy').map((o) => o.price), [99, 95, 90]);
});

test('competing sell orders are only the ones at the station, cheapest first', () => {
  const book = [
    order({ isBuy: false, price: 110 }),
    order({ isBuy: false, price: 105 }),
    order({ isBuy: false, price: 101, locationId: OTHER_JITA_STATION }),
  ];
  assert.deepEqual(competingOrders(book, JITA_4_4, 'sell').map((o) => o.price), [105, 110]);
});

test('a Perimeter buy order competes with every buy order Jita 4-4 sellers can fill', () => {
  const mine = order({
    price: 100,
    range: '1',
    locationId: NEUTRAL_STATES_HQ.locationId,
    systemId: PERIMETER,
  });
  const book = [
    mine,
    order({ price: 99, range: 'station' }),
    order({
      price: 105,
      range: 'station',
      locationId: NEUTRAL_STATES_HQ.locationId,
      systemId: PERIMETER,
    }),
  ];
  assert.deepEqual(orderStanding(mine, book, JITA_4_4, new Set([mine.orderId])), {
    status: 'top',
    nextPrice: 99,
  });

  const jitaBid = order({ price: 101, range: 'station' });
  assert.deepEqual(orderStanding(mine, [...book, jitaBid], JITA_4_4, new Set([mine.orderId])), {
    status: 'outbid',
    bestPrice: 101,
    bestLocationId: JITA_4_4.locationId,
    ordersAhead: 1,
  });
});

test('a buy order that does not reach the trading station is away', () => {
  const mine = order({
    range: 'station',
    locationId: NEUTRAL_STATES_HQ.locationId,
    systemId: PERIMETER,
  });
  assert.deepEqual(orderStanding(mine, [mine], JITA_4_4, new Set([mine.orderId])), {
    status: 'away',
  });
});

test('own orders do not count, and at the same price the older order is ahead', () => {
  const mine = order({ isBuy: false, price: 100, issued: '2026-11-02T00:00:00Z' });
  const myOther = order({ isBuy: false, price: 99 });
  const older = order({ isBuy: false, price: 100, issued: '2026-11-01T00:00:00Z' });
  const own = new Set([mine.orderId, myOther.orderId]);
  assert.deepEqual(orderStanding(mine, [mine, myOther], JITA_4_4, own), {
    status: 'top',
    nextPrice: null,
  });
  assert.equal(orderStanding(mine, [mine, myOther, older], JITA_4_4, own).status, 'outbid');
  assert.deepEqual(
    orderStanding(order({ isBuy: false, locationId: OTHER_JITA_STATION }), [], JITA_4_4, own),
    { status: 'away' },
  );
});
