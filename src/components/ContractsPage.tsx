import { Box, CircularProgress, TextField } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useLocalhostAxios } from 'lib/util';
import { useState } from 'react';

// TODO
//  1. Contract count
//  2. Split in progress and finished
//  3. Order by time finished/expiration
//  4. Filtering
export default function ContractsPage() {
  const [{ data }] = useLocalhostAxios('/contracts');

  const [searchText, setSearchText] = useState('');

  const indexedData =
    data && data.map((d: any, i: number) => ({ id: i, ...d }));

  const isIncluded = (s: string) =>
    s.toLowerCase().includes(searchText.toLowerCase());
  const filteredData = indexedData && indexedData.filter((d: any) =>
    (d.acceptor && isIncluded(d.acceptor.name))
    || (d.assignee && isIncluded(d.assignee.name))
    || (d.issuer && isIncluded(d.issuer.name))
    || (d.title && isIncluded(d.title))
  );

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
    <Box sx={{ pb: 2 }}>
      <TextField
        label="Search..."
        variant="outlined"
        value={searchText}
        onChange={e => setSearchText(e.target.value)}
      />
    </Box>
    {filteredData ?
      <Box sx={{ height: 'auto', width: '100%' }}>
        <DataGrid
          autoHeight
          density="compact"
          rows={filteredData}
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