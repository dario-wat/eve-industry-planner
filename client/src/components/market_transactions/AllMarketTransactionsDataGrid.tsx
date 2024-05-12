import { WalletTransactionsRes } from '@internal/shared';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import EveIconAndName from 'components/util/EveIconAndName';
import { ColoredNumber, formatNumber } from 'components/util/numbers';
import { format } from 'date-fns';

const columns: GridColDef[] = [
  {
    field: 'name',
    headerName: 'Name',
    width: 280,
    sortable: false,
    renderCell: params =>
      <EveIconAndName
        typeId={params.row.typeId}
        categoryId={params.row.categoryId}
        name={params.row.name}
      />,
  },
  {
    field: 'quantity',
    headerName: 'Quantity',
    width: 80,
    align: 'right',
    sortable: false,
  },
  {
    field: 'unitPrice',
    headerName: 'Unit Price',
    width: 100,
    align: 'right',
    sortable: false,
    valueFormatter: (value: any) => formatNumber(value),
  },
  {
    field: 'total',
    headerName: 'Total',
    width: 100,
    align: 'right',
    sortable: false,
    renderCell: params =>
      <ColoredNumber
        number={params.row.quantity * params.row.unitPrice}
        color={params.row.isBuy ? 'red' : 'green'}
      />,
  },
  {
    field: 'locationName',
    headerName: 'Location',
    width: 350,
    sortable: false,
  },
  {
    field: 'date',
    headerName: 'Time',
    width: 150,
    sortable: false,
    valueFormatter: (value: any) => format(
      new Date(value),
      'yyyy.MM.dd - HH:mm',
    ),
  },
  {
    field: 'characterName',
    headerName: 'Character',
    width: 150,
    sortable: false,
  },
];

/**
 * Shows the data grid of all transactions.
 */
export default function AllMarketTransactionsDataGrid(props: {
  data: WalletTransactionsRes,
}) {
  return (
    <DataGrid
      initialState={{
        sorting: {
          sortModel: [{ field: 'date', sort: 'desc' }],
        },
      }}
      rows={props.data}
      columns={columns}
      disableRowSelectionOnClick
      disableColumnMenu
    />
  );
}