import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useAppSelector } from 'redux/hooks';
import { selectPlannedProducts } from 'redux/slices/plannedProductsSlice';

export default function DashboardProductsDataGrid() {
  const rows = useAppSelector(selectPlannedProducts);

  const indexedRows = rows.map((d: any, i: number) => ({ id: i, ...d }));

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Product',
      width: 300,
      sortable: false,
    },
    {
      field: 'quantity',
      headerName: 'Quantity',
      width: 100,
      sortable: false,
    },
  ];

  return (
    <DataGrid
      rows={indexedRows}
      columns={columns}
      disableSelectionOnClick
      disableColumnMenu
      experimentalFeatures={{ newEditingApi: true }}
    />
  );
}