import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { PlannedProductsRes } from '@internal/shared';

export default function DashboardProductsDataGrid(
  props: {
    plannedProducts: PlannedProductsRes,
  }
) {
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
      rows={props.plannedProducts}
      columns={columns}
      disableSelectionOnClick
      disableColumnMenu
      experimentalFeatures={{ newEditingApi: true }}
    />
  );
}