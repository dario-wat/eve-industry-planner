import { WalletTransactionsRes } from "@internal/shared";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import EveIconAndName from "components/util/EveIconAndName";
import { ColoredNumber } from "components/util/numbers";
import { transactionAggregate } from "./transactionAggregate";

const columns: GridColDef[] = [
  {
    field: 'name',
    headerName: 'Name',
    width: 300,
    sortable: false,
    renderCell: params =>
      <EveIconAndName
        typeId={params.row.typeId}
        categoryId={params.row.categoryId}
        name={params.row.name}
      />,
  },
  {
    field: 'buyQuantity',
    headerName: 'Bought',
    width: 100,
    align: 'right',
    renderCell: params => <ColoredNumber number={params.value} color="red" />,
  },
  {
    field: 'sellQuantity',
    headerName: 'Sold',
    width: 100,
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
    width: 100,
    align: 'right',
    renderCell: params =>
      <ColoredNumber
        number={params.value}
        color={params.value < 0 ? 'red' : 'green'}
        fractionDigits={1}
      />,
  },
];

/**
 * Aggregated transactions and shows some useful data such as
 * number of items bought/sold, average price and so on
 */
export default function AggregatedTransactionsDataGrid(props: {
  data: WalletTransactionsRes,
}) {
  const aggregatedData = transactionAggregate(props.data);

  return (
    <DataGrid
      rows={aggregatedData}
      columns={columns}
      sortModel={[{ field: 'sellVolume', sort: 'desc' }]}
      disableSelectionOnClick
      disableColumnMenu
    />
  );
}