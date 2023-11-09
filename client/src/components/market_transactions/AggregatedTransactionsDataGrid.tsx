import { WalletTransactionsRes } from "@internal/shared";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import EveIconAndName from "components/util/EveIconAndName";
import { sum } from "mathjs";
import { groupBy } from "underscore";

const columns: GridColDef[] = [
  {
    field: 'name',
    headerName: 'Name',
    width: 350,
    sortable: false,
    renderCell: params =>
      <EveIconAndName
        typeId={params.row.typeId}
        categoryId={params.row.categoryId}
        name={params.row.name}
      />,
  },
  {
    field: 'totalQuantity',
    headerName: 'Quantity',
    width: 100,
    align: 'right',
    sortable: true,
  },
  {
    field: 'averagePrice',
    headerName: 'Average Price',
    width: 150,
    align: 'right',
    sortable: true,
    renderCell: params =>
      <div style={{ color: 'green', fontWeight: 'bold' }}>
        {params.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
      </div>,
  },
  {
    field: 'totalPrice',
    headerName: 'Total',
    width: 150,
    align: 'right',
    sortable: true,
    renderCell: params =>
      <div style={{ color: 'green', fontWeight: 'bold' }}>
        {params.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
      </div>,
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
  const aggregatedData = Object.entries(
    groupBy(props.data.filter(t => !t.isBuy), 'typeId'),
  ).map(d => {
    const totalQuantity = sum(d[1].map(t => t.quantity));
    const totalPrice = sum(d[1].map(t => t.quantity * t.unitPrice));
    return {
      averagePrice: totalPrice / totalQuantity,
      totalPrice,
      totalQuantity,
      typeId: d[1][0].typeId,
      categoryId: d[1][0].categoryId,
      name: d[1][0].name,
    };
  });

  return (
    <DataGrid
      rows={aggregatedData}
      columns={columns}
      disableSelectionOnClick
      disableColumnMenu
      experimentalFeatures={{ newEditingApi: true }}
    />
  );
}