import { FeesAndTaxesRes } from "@internal/shared";
import { CircularProgress } from "@mui/material";
import { BarChart } from "@mui/x-charts";
import useAxios from "axios-hooks";
import { format, isAfter, isBefore } from "date-fns";
import { sum } from "mathjs";
import { groupBy } from "underscore";
import { useMarketTransactionsStore } from "./marketTransactionsStore";

export default function FeesAndTaxesDataGrid(props: {}) {
  const { startDate, endDate } = useMarketTransactionsStore();
  const [{ data }] = useAxios<FeesAndTaxesRes>('/fees_and_taxes');
  if (!data) {
    return <CircularProgress />;
  }

  const filteredData = data && data.filter(d =>
    isBefore(new Date(d.date), endDate)
    && isAfter(new Date(d.date), startDate)
  );

  const datedData = Object.entries(groupBy(
    filteredData,
    d => format(new Date(d.date), 'yyyy-MM-dd'),
  ));

  const feesAndTaxesByDay = datedData.map(([date, feesAndTaxes]) => {
    const brokerFees = feesAndTaxes.filter(d => d.type === 'brokers_fee');
    const transactionTaxes = feesAndTaxes.filter(d => d.type === 'transaction_tax');
    return {
      date,
      brokerFees: sum(brokerFees.map(bf => bf.amount)) as number,
      transactionTaxes: sum(transactionTaxes.map(tt => tt.amount)) as number,
    };
  }).sort((a, b) => a.date.localeCompare(b.date));;

  return (
    <BarChart
      xAxis={[{
        scaleType: 'band',
        data: feesAndTaxesByDay.map(d => d.date),
      }]}
      series={[
        {
          data: feesAndTaxesByDay.map(d => d.brokerFees),
          color: 'red',
          stack: 'A',
          label: 'Broker Fees',
        },
        {
          data: feesAndTaxesByDay.map(d => d.transactionTaxes),
          color: 'orange',
          stack: 'A',
          label: 'Transaction Tax',
        },
      ]}
      width={500}
      height={300}
    />
  );
}