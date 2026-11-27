import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  FeeRates,
  netProfitAfterRelists,
  relistBudget,
  repriceOption,
  roundTrip,
  RoundTripInput,
} from '@internal/shared';

/** Trading Lady as charged in July 2025: Accounting V, 0% owner fee in Perimeter. */
const PERIMETER: FeeRates = {
  brokerRate: 0.005,
  sccSurchargeRate: 0.005,
  salesTaxRate: 0.03375,
  relistDiscount: 0.8,
};
const JITA: FeeRates = {
  brokerRate: 0.01,
  sccSurchargeRate: 0,
  salesTaxRate: 0.03375,
  relistDiscount: 0.8,
};

function close(actual: number, expected: number): void {
  assert.ok(
    Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)),
    `${actual} is not ${expected}`,
  );
}

function perimeterToJita(overrides: Partial<RoundTripInput> = {}): RoundTripInput {
  return {
    buy: { price: 1_000_000, rates: PERIMETER, mode: 'order' },
    sell: { price: 1_100_000, rates: JITA, mode: 'order' },
    quantity: 100,
    ...overrides,
  };
}

test('buy order in Perimeter, sell order in Jita uses each location\'s fees', () => {
  const trip = roundTrip(perimeterToJita());
  close(trip.buyValue, 100_000_000);
  close(trip.buyBrokerFee, 500_000 + 100);
  close(trip.sellValue, 110_000_000);
  close(trip.sellBrokerFee, 1_100_000);
  close(trip.salesTax, 3_712_500);
  close(trip.capital, 101_600_100);
  close(trip.netProfit, 4_687_400);
  close(trip.profitPerUnit, 46_874);
  close(trip.margin, 4_687_400 / 110_000_000);
  close(trip.roi, 4_687_400 / 101_600_100);
});

test('instant legs pay no broker fee, and selling instantly still pays sales tax', () => {
  const trip = roundTrip(perimeterToJita({
    buy: { price: 1_000_000, rates: PERIMETER, mode: 'instant' },
    sell: { price: 1_100_000, rates: JITA, mode: 'instant' },
  }));
  assert.equal(trip.buyBrokerFee, 0);
  assert.equal(trip.sellBrokerFee, 0);
  close(trip.netProfit, 110_000_000 - 3_712_500 - 100_000_000);
});

test('other costs per unit count as capital', () => {
  const trip = roundTrip(perimeterToJita({ otherCostPerUnit: 1000 }));
  close(trip.otherCost, 100_000);
  close(trip.netProfit, 4_587_400);
});

test('selling at the breakeven price nets zero', () => {
  for (const input of [
    perimeterToJita(),
    perimeterToJita({ sell: { price: 1, rates: JITA, mode: 'instant' } }),
    perimeterToJita({ quantity: 1, buy: { price: 1000, rates: PERIMETER, mode: 'order' } }),
    perimeterToJita({
      quantity: 1,
      buy: { price: 1000, rates: JITA, mode: 'order' },
      sell: { price: 1, rates: PERIMETER, mode: 'order' },
    }),
  ]) {
    const price = roundTrip(input).breakevenSellPrice;
    const atBreakeven = roundTrip({ ...input, sell: { ...input.sell, price } });
    assert.ok(Math.abs(atBreakeven.netProfit) < 1e-6, `${atBreakeven.netProfit} at ${price}`);
  }
});

test('modifying is cheaper than replacing for an undercut', () => {
  const option = repriceOption(JITA, 110_000_000, 109_999_000);
  close(option.modifyFee, 0.2 * 0.01 * 109_999_000);
  close(option.replaceFee, 0.01 * 109_999_000);
  assert.equal(option.cheaper, 'modify');
});

test('replacing is cheaper once the new value is over 5 times the old at an 80% discount', () => {
  const modify = repriceOption(JITA, 100_000_000, 200_000_000);
  close(modify.modifyFee, 0.2 * 0.01 * 200_000_000 + 0.01 * 100_000_000);
  close(modify.replaceFee, 2_000_000);
  assert.equal(modify.cheaper, 'modify');

  const replace = repriceOption(JITA, 30_000_000, 200_000_000);
  close(replace.modifyFee, 0.2 * 0.01 * 200_000_000 + 0.01 * 170_000_000);
  assert.equal(replace.cheaper, 'replace');
});

test('relist budget counts reprices at each location\'s fees', () => {
  const budget = relistBudget(perimeterToJita());
  close(budget.buyRelistFee, 0.2 * 0.005 * 100_000_000 + 100);
  close(budget.sellRelistFee, 0.2 * 0.01 * 110_000_000);
  close(budget.budget, 4_687_400);
  assert.equal(budget.maxBuyRelists, Math.floor(4_687_400 / 100_100));
  assert.equal(budget.maxSellRelists, Math.floor(4_687_400 / 220_000));
});

test('relist budget is 0 for a losing trip, and null for instant legs', () => {
  const budget = relistBudget(perimeterToJita({
    sell: { price: 1_000_000, rates: JITA, mode: 'instant' },
  }));
  assert.equal(budget.maxBuyRelists, 0);
  assert.equal(budget.maxSellRelists, null);
  assert.equal(budget.sellRelistFee, 0);
});

test('net profit after relists subtracts each side\'s reprices', () => {
  close(netProfitAfterRelists(perimeterToJita(), 3, 10), 4_687_400 - 3 * 100_100 - 10 * 220_000);
});
