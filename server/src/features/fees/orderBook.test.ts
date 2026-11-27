import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buyOrderReaches,
  competingOrders,
  instantBuy,
  instantSell,
  priceAtDepth,
  TradeBookOrderRes,
  tradeHubJumps,
  unitsAhead,
} from '@internal/shared';

const JITA = 30000142;
const PERIMETER = 30000144;
const JITA_4_4 = { locationId: 60003760, systemId: JITA };
const OTHER_JITA_STATION = 60003757;
const NEUTRAL_STATES_HQ = { locationId: 1044752365771, systemId: PERIMETER };

let nextOrderId = 1;

function order(overrides: Partial<TradeBookOrderRes>): TradeBookOrderRes {
  return {
    orderId: nextOrderId++,
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

function close(actual: number | null, expected: number): void {
  assert.ok(actual !== null && Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`);
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

test('instant buy walks the sell orders and reports the average and worst price', () => {
  const book = [
    order({ isBuy: false, price: 100, volumeRemain: 1 }),
    order({ isBuy: false, price: 110, volumeRemain: 4 }),
    order({ isBuy: false, price: 150, volumeRemain: 100 }),
  ];
  const fill = instantBuy(book, JITA_4_4, 10);
  assert.equal(fill.quantity, 10);
  close(fill.averagePrice, (100 + 4 * 110 + 5 * 150) / 10);
  assert.equal(fill.worstPrice, 150);
  assert.equal(fill.topPrice, 100);
  close(fill.slippage, (129 - 100) / 100);
});

test('instant sell skips buy orders whose minimum volume the sale does not meet', () => {
  const book = [
    order({ price: 120, volumeRemain: 100, minVolume: 50 }),
    order({ price: 100, volumeRemain: 100 }),
  ];
  const small = instantSell(book, JITA_4_4, 10);
  assert.equal(small.topPrice, 100);
  close(small.averagePrice, 100);

  const large = instantSell(book, JITA_4_4, 60);
  assert.equal(large.topPrice, 120);
  close(large.averagePrice, 120);
});

test('a fill reports what is available when the book runs out', () => {
  const fill = instantBuy([order({ isBuy: false, volumeRemain: 3 })], JITA_4_4, 10);
  assert.equal(fill.quantity, 3);

  const empty = instantSell([], JITA_4_4, 10);
  assert.equal(empty.quantity, 0);
  assert.equal(empty.averagePrice, null);
  assert.equal(empty.slippage, null);
});

test('price at depth skips a tiny order at the top', () => {
  const competing = competingOrders([
    order({ price: 150, volumeRemain: 1 }),
    order({ price: 100, volumeRemain: 50 }),
    order({ price: 90, volumeRemain: 500 }),
  ], JITA_4_4, 'buy');
  assert.equal(priceAtDepth(competing, 1), 150);
  assert.equal(priceAtDepth(competing, 10), 100);
  assert.equal(priceAtDepth(competing, 100), 90);
  assert.equal(priceAtDepth(competing, 1000), null);
});

test('units ahead count better and equal prices on each side', () => {
  const buys = competingOrders([
    order({ price: 100, volumeRemain: 5 }),
    order({ price: 99, volumeRemain: 7 }),
    order({ price: 98, volumeRemain: 11 }),
  ], JITA_4_4, 'buy');
  assert.equal(unitsAhead(buys, 'buy', 99), 12);
  assert.equal(unitsAhead(buys, 'buy', 101), 0);

  const sells = competingOrders([
    order({ isBuy: false, price: 100, volumeRemain: 5 }),
    order({ isBuy: false, price: 101, volumeRemain: 7 }),
  ], JITA_4_4, 'sell');
  assert.equal(unitsAhead(sells, 'sell', 100), 5);
  assert.equal(unitsAhead(sells, 'sell', 102), 12);
});
