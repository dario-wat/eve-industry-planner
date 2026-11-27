/** Broker fees, sales tax and round-trip profit. Pure, so the client can recompute as you type. */

export type FeeRates = {
  /** Total, including the SCC surcharge. */
  brokerRate: number;
  /** Part of `brokerRate` paid to the SCC in a structure, 0 in an NPC station. */
  sccSurchargeRate: number;
  salesTaxRate: number;
  /** Share of the broker fee waived on every relist (modify order). */
  relistDiscount: number;
};

export const MIN_BROKER_FEE = 100;

/**
 * In a structure the SCC surcharge is charged separately, and the 100 ISK minimum applies
 * only to the owner's share: a 0% owner still charges 100 ISK per order.
 */
export function brokerFee(rates: FeeRates, orderValue: number): number {
  return splitFee(rates, (rate) => rate * orderValue);
}

/** Charged on the whole new order value on every relist, plus full broker fee on any raise. */
export function relistFee(rates: FeeRates, oldOrderValue: number, newOrderValue: number): number {
  return splitFee(
    rates,
    (rate) => (1 - rates.relistDiscount) * rate * newOrderValue
      + rate * Math.max(newOrderValue - oldOrderValue, 0),
  );
}

function splitFee(rates: FeeRates, fee: (rate: number) => number): number {
  return fee(rates.sccSurchargeRate)
    + Math.max(MIN_BROKER_FEE, fee(rates.brokerRate - rates.sccSurchargeRate));
}

/**
 * `order` places an order and waits for it to fill, paying the broker fee at that location.
 * `instant` takes the best order on the other side: no broker fee.
 */
export type TradeMode = 'order' | 'instant';

/** One side of a trade. Buy and sell can be at different locations with different rates. */
export type TradeLeg = {
  price: number;
  rates: FeeRates;
  mode: TradeMode;
};

export type RoundTripInput = {
  buy: TradeLeg;
  sell: TradeLeg;
  quantity: number;
  /** Hauling, collateral, or anything else paid per unit between the two legs. */
  otherCostPerUnit?: number;
};

export type RoundTrip = {
  buyValue: number;
  buyBrokerFee: number;
  sellValue: number;
  sellBrokerFee: number;
  salesTax: number;
  otherCost: number;
  /** Everything paid out before the sale: buy value, both broker fees and other costs. */
  capital: number;
  netProfit: number;
  profitPerUnit: number;
  /** Net profit over sell value. */
  margin: number;
  /** Net profit over capital. */
  roi: number;
  /** Sell price at which net profit is 0, for this quantity and sell mode. */
  breakevenSellPrice: number;
};

export function roundTrip(input: RoundTripInput): RoundTrip {
  const { buy, sell, quantity } = input;
  const buyValue = buy.price * quantity;
  const sellValue = sell.price * quantity;
  const buyBrokerFee = legBrokerFee(buy, buyValue);
  const sellBrokerFee = legBrokerFee(sell, sellValue);
  const salesTax = sell.rates.salesTaxRate * sellValue;
  const otherCost = (input.otherCostPerUnit ?? 0) * quantity;
  const capital = buyValue + buyBrokerFee + sellBrokerFee + otherCost;
  const netProfit = sellValue - salesTax - capital;
  return {
    buyValue,
    buyBrokerFee,
    sellValue,
    sellBrokerFee,
    salesTax,
    otherCost,
    capital,
    netProfit,
    profitPerUnit: netProfit / quantity,
    margin: sellValue === 0 ? 0 : netProfit / sellValue,
    roi: capital === 0 ? 0 : netProfit / capital,
    breakevenSellPrice: breakevenSellPrice(input, buyValue + buyBrokerFee + otherCost),
  };
}

function legBrokerFee(leg: TradeLeg, value: number): number {
  return leg.mode === 'order' ? brokerFee(leg.rates, value) : 0;
}

/** Solves the sell price, first assuming the owner fee is above its minimum, then at it. */
function breakevenSellPrice(input: RoundTripInput, costBeforeSale: number): number {
  const { sell, quantity } = input;
  const tax = sell.rates.salesTaxRate;
  if (sell.mode === 'instant') {
    return costBeforeSale / (quantity * (1 - tax));
  }
  const ownerRate = sell.rates.brokerRate - sell.rates.sccSurchargeRate;
  const aboveMinimum = costBeforeSale / (quantity * (1 - tax - sell.rates.brokerRate));
  if (ownerRate * aboveMinimum * quantity >= MIN_BROKER_FEE) {
    return aboveMinimum;
  }
  return (costBeforeSale + MIN_BROKER_FEE)
    / (quantity * (1 - tax - sell.rates.sccSurchargeRate));
}

export type RepriceOption = {
  /** Fee to modify the order to the new price. */
  modifyFee: number;
  /** Fee to cancel and place a new order at the new price. The old broker fee is not refunded. */
  replaceFee: number;
  cheaper: 'modify' | 'replace';
};

/** Values are price x remaining volume, before and after the reprice. */
export function repriceOption(
  rates: FeeRates,
  oldOrderValue: number,
  newOrderValue: number,
): RepriceOption {
  const modifyFee = relistFee(rates, oldOrderValue, newOrderValue);
  const replaceFee = brokerFee(rates, newOrderValue);
  return { modifyFee, replaceFee, cheaper: replaceFee < modifyFee ? 'replace' : 'modify' };
}

export type RelistBudget = {
  /** Fee of one small reprice on each side, at the trip's order values. */
  buyRelistFee: number;
  sellRelistFee: number;
  /** Net profit that can go to relist fees before the trip stops breaking even. */
  budget: number;
  /** Relists possible on one side when the other side is never relisted. Null for instant legs. */
  maxBuyRelists: number | null;
  maxSellRelists: number | null;
};

/**
 * How many reprices the trip can absorb and still break even. Each reprice is treated as a
 * small undercut, so the order value barely changes.
 */
export function relistBudget(input: RoundTripInput): RelistBudget {
  const trip = roundTrip(input);
  const buyRelistFee = legRelistFee(input.buy, trip.buyValue);
  const sellRelistFee = legRelistFee(input.sell, trip.sellValue);
  const budget = trip.netProfit;
  return {
    buyRelistFee,
    sellRelistFee,
    budget,
    maxBuyRelists: maxRelists(budget, buyRelistFee),
    maxSellRelists: maxRelists(budget, sellRelistFee),
  };
}

/** Net profit after a given number of small reprices on each side. */
export function netProfitAfterRelists(
  input: RoundTripInput,
  buyRelists: number,
  sellRelists: number,
): number {
  const trip = roundTrip(input);
  return trip.netProfit
    - buyRelists * legRelistFee(input.buy, trip.buyValue)
    - sellRelists * legRelistFee(input.sell, trip.sellValue);
}

function legRelistFee(leg: TradeLeg, value: number): number {
  return leg.mode === 'order' ? relistFee(leg.rates, value, value) : 0;
}

function maxRelists(budget: number, fee: number): number | null {
  if (fee === 0) {
    return null;
  }
  return budget <= 0 ? 0 : Math.floor(budget / fee);
}
