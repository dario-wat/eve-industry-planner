import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CloseEvidence, closeEvidence } from './closeEvidence';
import { diffOrderBook, OpenOrder } from './diffOrderBook';

const NOW = new Date('2026-01-02T00:00:00Z');

let nextOrderId = 1;

function sell(overrides: Partial<OpenOrder> = {}): OpenOrder {
  return {
    orderId: nextOrderId++,
    typeId: 34,
    locationId: 60003760,
    systemId: 30000142,
    isBuy: false,
    price: 100,
    volumeRemain: 1000,
    volumeTotal: 1000,
    minVolume: 1,
    range: 'region',
    issued: Date.parse('2026-01-01T00:00:00Z'),
    duration: 90,
    missing: false,
    ...overrides,
  };
}

function buy(overrides: Partial<OpenOrder> = {}): OpenOrder {
  return sell({ isBuy: true, range: 'station', ...overrides });
}

function run(previous: OpenOrder[], next: OpenOrder[]): CloseEvidence[] {
  return closeEvidence(previous, next, diffOrderBook(previous, next, NOW));
}

function runOne(previous: OpenOrder[], next: OpenOrder[]): CloseEvidence {
  const result = run(previous, next);
  assert.equal(result.length, 1);
  return result[0];
}

test('an order alone in its book has empty evidence', () => {
  const gone = sell();
  assert.deepEqual(runOne([gone], []), {
    order: gone,
    betterOrdersBefore: 0,
    betterVolumeBefore: 0,
    bestPriceAfter: null,
    bestOppositePriceAfter: null,
    survivor: null,
    relist: null,
    pollTradedVolume: 0,
    nearestTradedPrice: null,
    pollMissedCount: 1,
  });
});

test('only newly missed orders produce evidence', () => {
  const alreadyMissing = sell({ missing: true });
  const listed = sell();
  assert.deepEqual(run([alreadyMissing, listed], [listed]), []);
});

test('better orders before are strictly better priced and were listed', () => {
  const gone = sell({ price: 100 });
  const listed = [
    sell({ price: 98, volumeRemain: 10 }),
    sell({ price: 99, volumeRemain: 20 }),
    sell({ price: 100 }),
    sell({ price: 101 }),
  ];
  const alreadyMissing = sell({ price: 97, missing: true });
  const evidence = runOne([gone, ...listed, alreadyMissing], listed);
  assert.equal(evidence.betterOrdersBefore, 2);
  assert.equal(evidence.betterVolumeBefore, 30);
});

test('a higher price is better for buy orders', () => {
  const gone = buy({ price: 100 });
  const higher = buy({ price: 101, volumeRemain: 7 });
  const lower = buy({ price: 99 });
  const evidence = runOne([gone, higher, lower], [higher, lower]);
  assert.equal(evidence.betterOrdersBefore, 1);
  assert.equal(evidence.betterVolumeBefore, 7);
  assert.equal(evidence.bestPriceAfter, 101);
});

test('best prices after come from the same type and location', () => {
  const evidence = runOne([sell()], [
    sell({ price: 105 }),
    sell({ price: 103 }),
    buy({ price: 90 }),
    buy({ price: 95 }),
    sell({ price: 1, typeId: 35 }),
    sell({ price: 1, locationId: 2 }),
    buy({ price: 999, typeId: 35 }),
    buy({ price: 999, locationId: 2 }),
  ]);
  assert.equal(evidence.bestPriceAfter, 103);
  assert.equal(evidence.bestOppositePriceAfter, 95);
});

test('the best opposite price for a buy order is the lowest sell', () => {
  const evidence = runOne([buy()], [sell({ price: 110 }), sell({ price: 108 })]);
  assert.equal(evidence.bestOppositePriceAfter, 108);
});

test('the survivor is the best order that stayed unchanged', () => {
  const gone = sell({ price: 100 });
  const best = sell({ price: 97 });
  const listed = [sell({ price: 99 }), best, sell({ price: 98 })];
  assert.equal(runOne([gone, ...listed], listed).survivor, best);
});

test('a better order that vanished, repriced or was reissued is not a survivor', () => {
  const gone = sell({ price: 100 });
  const better = sell({ price: 99 });
  const vanished = run([gone, better], []).find(({ order }) => order === gone);
  assert.ok(vanished);
  assert.equal(vanished.survivor, null);
  assert.equal(runOne([gone, better], [{ ...better, price: 98 }]).survivor, null);
  assert.equal(runOne([gone, better], [{ ...better, issued: better.issued + 1 }]).survivor, null);
});

test('a partly filled better order survives with its earlier volume', () => {
  const gone = sell({ price: 100 });
  const better = sell({ price: 99, volumeRemain: 50 });
  const evidence = runOne([gone, better], [{ ...better, volumeRemain: 40 }]);
  assert.equal(evidence.survivor, better);
  assert.equal(evidence.betterVolumeBefore, 50);
});

test('a buy survivor needs at least the range of the closed order', () => {
  const ranges = ['station', 'solarsystem', '1', '5', '10', '40', 'region'];
  ranges.forEach((survivorRange, survivorRank) => {
    ranges.forEach((range, rank) => {
      const gone = buy({ price: 100, range });
      const better = buy({ price: 101, range: survivorRange });
      assert.equal(
        runOne([gone, better], [better]).survivor,
        survivorRank >= rank ? better : null,
        `${survivorRange} survivor, ${range} order`,
      );
    });
  });
});

test('a buy survivor cannot have a higher minimum volume', () => {
  const gone = buy({ price: 100, minVolume: 10 });
  const same = buy({ price: 101, minVolume: 10 });
  const higher = buy({ price: 101, minVolume: 11 });
  assert.equal(runOne([gone, same], [same]).survivor, same);
  assert.equal(runOne([gone, higher], [higher]).survivor, null);
});

test('range and minimum volume do not matter for sell survivors', () => {
  const gone = sell({ price: 100, range: 'region' });
  const better = sell({ price: 99, range: 'station', minVolume: 500 });
  assert.equal(runOne([gone, better], [better]).survivor, better);
});

test('the relist tolerance is 5% of the remaining volume, inclusive', () => {
  const gone = sell({ volumeTotal: 5000, volumeRemain: 1000 });
  const isRelist = (volumeTotal: number): boolean =>
    runOne([gone], [sell({ volumeTotal })]).relist !== null;
  assert.equal(isRelist(950), true);
  assert.equal(isRelist(1050), true);
  assert.equal(isRelist(949), false);
  assert.equal(isRelist(1051), false);
  assert.equal(isRelist(5000), false);
});

test('the relist is the closest volume among new orders in the same book', () => {
  const gone = sell();
  const existing = sell();
  const close = sell({ volumeTotal: 1005 });
  const evidence = runOne([gone, existing], [
    existing,
    sell({ volumeTotal: 1030 }),
    close,
    buy(),
    sell({ typeId: 35 }),
    sell({ locationId: 2 }),
  ]);
  assert.equal(evidence.relist, close);
});

test('trades count only in the same book', () => {
  const gone = sell({ price: 100 });
  const listed = [
    sell({ price: 102 }),
    sell({ price: 90 }),
    buy({ price: 100 }),
    sell({ price: 100, typeId: 35 }),
    sell({ price: 100, locationId: 2 }),
  ];
  const evidence = runOne(
    [gone, ...listed],
    listed.map((order) => ({ ...order, volumeRemain: order.volumeRemain - 100 })),
  );
  assert.equal(evidence.pollTradedVolume, 200);
  assert.equal(evidence.nearestTradedPrice, 102);
});

test('missed orders are counted per book and keep their order', () => {
  const gone = [sell(), sell(), sell({ typeId: 35 }), buy()];
  const result = run(gone, []);
  assert.deepEqual(result.map(({ order }) => order), gone);
  assert.deepEqual(result.map(({ pollMissedCount }) => pollMissedCount), [2, 2, 1, 1]);
});
