import { Box, Card, CardContent, CircularProgress, TextField, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useLocalhostAxios } from 'lib/util';
import { useState } from 'react';

const FINISHED_STATUS = 'finished';

// TODO
//  - Order by time accepted for finished
//  - Add location
//  - style header row
//  - style columns (add color n shit)
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

  const finishedContracts = filteredData &&
    filteredData.filter((c: any) => c.status === FINISHED_STATUS);
  const activeContracts = filteredData &&
    filteredData.filter((c: any) => c.status !== FINISHED_STATUS);

  const columns: GridColDef[] = [
    {
      field: 'issuer',
      headerName: 'Issuer',
      width: 150,
      sortable: false,
      valueGetter: params => params?.value?.name,
    },
    {
      field: 'assignee',
      headerName: 'Assignee',
      width: 150,
      sortable: false,
      valueGetter: params => params?.value?.name,
    },
    {
      field: 'acceptor',
      headerName: 'Acceptor',
      width: 150,
      sortable: false,
      valueGetter: params => params?.value?.name,
    },
    {
      field: 'title',
      headerName: 'Title',
      width: 200,
      sortable: false,
    },
    {
      field: 'price',
      headerName: 'Price',
      width: 100,
      sortable: false,
      valueGetter: params =>
        params.value > 1000000
          ? (params.value / 1000000).toFixed(1) + 'M'
          : params.value > 1000
            ? (params.value / 1000) + 'K'
            : params.value
    },
    {
      field: 'end_time_formatted',
      headerName: 'Expires',
      width: 120,
      sortable: false,
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 130,
      sortable: false,
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
    <Box sx={{ pb: 1, pt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Active Contracts
      </Typography>
    </Box>
    <Card>
      <CardContent>
        {activeContracts ?
          <Box sx={{ height: 'auto', width: '100%' }}>
            <DataGrid
              autoHeight
              density="compact"
              rows={activeContracts}
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
      </CardContent>
    </Card>
    <Box sx={{ pb: 1, pt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Finished Contracts
      </Typography>
    </Box>
    {finishedContracts ?
      <Box sx={{ height: 'auto', width: '100%' }}>
        <DataGrid
          autoHeight
          density="compact"
          rows={finishedContracts}
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