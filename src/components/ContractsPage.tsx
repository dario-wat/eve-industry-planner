import { Box, CircularProgress } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useLocalhostAxios } from 'lib/util';

// TODO
//  1. Contract count
export default function ContractsPage() {
  const [{ data }] = useLocalhostAxios('/contracts');

  const indexedData =
    data && data.map((d: any, i: number) => ({ id: i, ...d }));

  const columns: GridColDef[] = [
    {
      field: 'acceptor',
      headerName: 'Acceptor',
      width: 200,
      sortable: false,
      valueGetter: params => params?.value?.name,
    },
    {
      field: 'assignee',
      headerName: 'Assignee',
      width: 200,
      sortable: false,
      valueGetter: params => params?.value?.name,
    },
    {
      field: 'end_time_formatted',
      headerName: 'Expires',
      width: 200,
      sortable: false,
    },
    {
      field: 'title',
      headerName: 'Title',
      width: 200,
      sortable: false,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      sortable: false,
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 200,
      sortable: false,
    },
    {
      field: 'price',
      headerName: 'Price',
      width: 200,
      sortable: false,
    },
    {
      field: 'issuer',
      headerName: 'Issuer',
      width: 200,
      sortable: false,
      valueGetter: params => params?.value?.name,
    },
  ];
  return <div>
    {
      indexedData ?
        <Box sx={{ height: 'auto', width: '100%' }}>
          <DataGrid
            autoHeight
            density="compact"
            rows={indexedData}
            columns={columns}
            pageSize={100}
            rowsPerPageOptions={[100]}
            disableSelectionOnClick
            disableColumnMenu
            experimentalFeatures={{ newEditingApi: true }}
          />
        </Box>
        : <CircularProgress />
    }
  </div>;
}