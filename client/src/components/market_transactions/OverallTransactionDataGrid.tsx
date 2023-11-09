import { WalletTransactionsRes } from "@internal/shared";
import { BarChart } from "@mui/x-charts";
import { format } from "date-fns";
import { sum } from "mathjs";
import { groupBy } from "underscore";
import { transactionAggregate } from "./transactionAggregate";

export default function OverallTransactionDataGrid(props: {
  data: WalletTransactionsRes,
}) {
  const datedData = Object.entries(groupBy(
    props.data.filter(transaction => !transaction.isBuy),
    transaction => format(new Date(transaction.date), 'yyyy-MM-dd'),
  ));
  const volumePerDay = datedData.map(([date, transactions]) =>
    [date, sum(transactions.map(t => t.quantity * t.unitPrice))] as const
  ).sort((a, b) => a[0].localeCompare(b[0]));

  // TODO not very accurate
  // const aggregatedData = transactionAggregate(props.data);
  // let avgDiffByTypeId: Record<number, number> = {};
  // aggregatedData.forEach(data => {
  //   avgDiffByTypeId[data.typeId] = data.avgDiff;
  // });
  // const gainPerDay = datedData.map(([date, transactions]) =>
  //   [
  //     date,
  //     sum(transactions.map(t => t.quantity * (avgDiffByTypeId[t.typeId] ?? 0)))
  //   ] as const
  // );

  return (
    <>
      <BarChart
        xAxis={[{ scaleType: 'band', data: volumePerDay.map(d => d[0]) }]}
        series={[{ data: volumePerDay.map(d => d[1]), color: 'green' }]}
        width={500}
        height={300}
      />
      {/* <BarChart
        xAxis={[{ scaleType: 'band', data: gainPerDay.map(d => d[0]) }]}
        series={[{ data: gainPerDay.map(d => d[1]), color: 'green' }]}
        width={500}
        height={300}
      /> */}
    </>
  );
}