import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { PlannedProductsRes } from 'types/types';

export default function DashboardProductsDataGrid(
  props: {
    plannedProducts: PlannedProductsRes,
  }
) {
  const indexedRows = props.plannedProducts.map(
    (d: any, i: number) => ({ id: i, ...d }),
  );

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