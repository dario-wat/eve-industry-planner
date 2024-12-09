import { MarketOrdersRes, WalletTransactionsRes } from "@internal/shared";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import EveIconAndName from "components/util/EveIconAndName";
import { ColoredNumber } from "components/util/numbers";
import { transactionAggregate } from "./transactionAggregate";
import useAxios from "axios-hooks";
import { Box, CircularProgress } from "@mui/material";

const columns: GridColDef[] = [
  {
    field: 'name',
    headerName: 'Name',
    width: 300,
    sortable: false,
    renderCell: params =>
      <Box sx={{
        color: params.row.hasBuyOrder ? 'default' : 'red',
        display: 'contents',
      }}>
        <EveIconAndName
          typeId={params.row.typeId}
          categoryId={params.row.categoryId}
          name={params.row.name}
        />
      </Box>,
  },
  {
    field: 'buyQuantity',
    headerName: 'Bought',
    width: 90,
    align: 'right',
    renderCell: params => <ColoredNumber number={params.value} color="red" />,
  },
  {
    field: 'sellQuantity',
    headerName: 'Sold',
    width: 90,
    align: 'right',
    renderCell: params => <ColoredNumber number={params.value} color="green" />,
  },
  {
    field: 'buyVolume',
    headerName: 'Buy Volume',
    width: 120,
    align: 'right',
    renderCell: params => <ColoredNumber number={params.value} color="red" />,
  },
  {
    field: 'sellVolume',
    headerName: 'Sell Volume',
    width: 120,
    align: 'right',
    renderCell: params => <ColoredNumber number={params.value} color="green" />,
  },
  {
    field: 'avgBuyPrice',
    headerName: 'Avg Buy',
    width: 100,
    align: 'right',
    renderCell: params => <ColoredNumber number={params.value} color="red" />,
  },
  {
    field: 'avgSellPrice',
    headerName: 'Avg Sell',
    width: 100,
    align: 'right',
    renderCell: params => <ColoredNumber number={params.value} color="green" />,
  },
  {
    field: 'avgDiff',
    headerName: 'Avg Diff',
    width: 100,
    align: 'right',
    renderCell: params =>
      <ColoredNumber
        number={params.value}
        color={params.value < 0 ? 'red' : 'green'}
      />,
  },
  {
    field: 'gainPerc',
    headerName: 'Gain %',
    width: 70,
    align: 'right',
    renderCell: params =>
      <ColoredNumber
        number={params.value}
        color={params.value < 5 ? 'red' : 'green'}
        fractionDigits={1}
      />,
  },
  {
    field: 'estimatedProfit',
    headerName: "Est profit",
    width: 100,
    align: 'right',
    renderCell: params => <ColoredNumber
      number={params.value}
      color={params.value < 0 ? 'red' : 'green'}
    />
  },
];

/**
 * Aggregated transactions and shows some useful data such as
 * number of items bought/sold, average price and so on
 */
export default function AggregatedTransactionsDataGrid(props: {
  data: WalletTransactionsRes,
}) {
  const [{ data }] = useAxios<MarketOrdersRes>('/market_orders');
  const buyOrders = new Set(data?.filter(d => d.isBuy)?.map(d => d.typeId));

  const aggregatedData = transactionAggregate(props.data);
  const aggregatedDataWithBuyOrder = aggregatedData.map(d =>
    ({ ...d, hasBuyOrder: buyOrders.has(d.typeId) })
  );

  return (
    data
      ? <DataGrid
        rows={aggregatedDataWithBuyOrder}
        columns={columns}
        sortModel={[{ field: 'estimatedProfit', sort: 'desc' }]}
        disableRowSelectionOnClick
        disableColumnMenu
      />
      : <CircularProgress />
  );
}