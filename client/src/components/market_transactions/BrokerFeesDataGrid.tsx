import { BrokerFeesRes } from "@internal/shared";
import { CircularProgress } from "@mui/material";
import { BarChart } from "@mui/x-charts";
import useAxios from "axios-hooks";
import { format } from "date-fns";
import { sum } from "mathjs";
import { groupBy } from "underscore";

export default function BrokerFeesDataGrid(props: {}) {
  const [{ data }] = useAxios<BrokerFeesRes>('/broker_fees');
  if (!data) {
    return <CircularProgress />;
  }

  const datedData = Object.entries(groupBy(
    data,
    brokerFee => format(new Date(brokerFee.date), 'yyyy-MM-dd'),
  ));
  const brokerFeesPerDay = datedData.map(([date, brokerFees]) =>
    [date, sum(brokerFees.map(bf => bf.amount))] as const
  ).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <BarChart
      xAxis={[{ scaleType: 'band', data: brokerFeesPerDay.map(d => d[0]) }]}
      series={[{ data: brokerFeesPerDay.map(d => d[1]), color: 'red' }]}
      width={500}
      height={300}
    />
  );
}