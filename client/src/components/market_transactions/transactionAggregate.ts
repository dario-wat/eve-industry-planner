import { WalletTransactionsRes } from "@internal/shared";
import { sum } from "mathjs";
import { groupBy } from "underscore";

type TransactionAggregate = {
  buyQuantity: any;
  sellQuantity: any;
  buyVolume: any;
  sellVolume: any;
  avgBuyPrice: number;
  avgSellPrice: number;
  avgDiff: number;
  gainPerc: number;
  typeId: number;
  categoryId: number | undefined;
  name: string;
}[];

export function transactionAggregate(
  data: WalletTransactionsRes,
): TransactionAggregate {
  return Object.values(
    groupBy(data, 'typeId')
  ).filter(transactions =>
    transactions.some(t => t.isBuy) && transactions.some(t => !t.isBuy)
  ).map(transactions => {
    const buyTransactions = transactions.filter(t => t.isBuy);
    const sellTransactions = transactions.filter(t => !t.isBuy);

    const buyQuantity = sum(buyTransactions.map(t => t.quantity));
    const sellQuantity = sum(sellTransactions.map(t => t.quantity));

    const buyVolume = sum(buyTransactions.map(t => t.quantity * t.unitPrice));
    const sellVolume = sum(sellTransactions.map(t => t.quantity * t.unitPrice));

    // Because of the filter, there should always be at least one 
    // buy and sell transaction
    const avgBuyPrice = buyVolume / buyQuantity;
    const avgSellPrice = sellVolume / sellQuantity;

    const avgDiff = avgSellPrice - avgBuyPrice;

    const gainPerc = 100 * avgDiff / avgSellPrice;
    return {
      buyQuantity,
      sellQuantity,
      buyVolume,
      sellVolume,
      avgBuyPrice,
      avgSellPrice,
      avgDiff,
      gainPerc,
      typeId: transactions[0].typeId,
      categoryId: transactions[0].categoryId,
      name: transactions[0].name,
    };
  });
}