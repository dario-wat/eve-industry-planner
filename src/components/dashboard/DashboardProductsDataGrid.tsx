import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useEffect, useState } from 'react';
import { PlannedProductsResponse } from 'types/types'

export default function DashboardProductsDataGrid(
  props: {
    data: PlannedProductsResponse,
  },
) {
  // TODO use setRows
  const [rows, setRows] = useState<PlannedProductsResponse>([]);
  useEffect(() => setRows(props.data ?? []), [props.data]);

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