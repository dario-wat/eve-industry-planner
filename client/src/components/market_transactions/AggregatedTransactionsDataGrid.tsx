import { WalletTransactionsRes } from "@internal/shared";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import EveIconAndName from "components/util/EveIconAndName";
import { ColoredNumber } from "components/util/numbers";
import { sum } from "mathjs";
import { groupBy } from "underscore";

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
    width: 100,
    align: 'right',
    renderCell: params => <ColoredNumber number={params.value} color="red" />,
  },
  {
    field: 'sellVolume',
    headerName: 'Sell Volume',
    width: 100,
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
  // Only care about sell transactions
  const aggregatedData = Object.values(
    groupBy(props.data, 'typeId'),
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

  return (
    <DataGrid
      rows={aggregatedData}
      columns={columns}
      sortModel={[{ field: 'sellVolume', sort: 'desc' }]}
      disableSelectionOnClick
      disableColumnMenu
      experimentalFeatures={{ newEditingApi: true }}
    />
  );
}