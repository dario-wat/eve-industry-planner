import { EveContractsRes } from '@internal/shared';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import useAxios from 'axios-hooks';
import { formatDistanceToNowStrict } from 'date-fns';
import { useState } from 'react';

const FINISHED_STATUS = 'finished';

// TODO
//  - Order by time accepted for finished
//  - Add location
//  - style header row
//  - style columns (add color n shit)
//  - remove expires from finished contracts
export default function ContractsPage() {
  const [{ data }] = useAxios<EveContractsRes>('/contracts');

  const [searchText, setSearchText] = useState('');

  const isIncluded = (s: string) =>
    s.toLowerCase().includes(searchText.toLowerCase());
  const filteredData = data && data.filter((d: any) =>
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
      valueFormatter: params => params?.value?.name,
    },
    {
      field: 'assignee',
      headerName: 'Assignee',
      width: 150,
      sortable: false,
      valueFormatter: params => params?.value?.name,
    },
    {
      field: 'acceptor',
      headerName: 'Acceptor',
      width: 150,
      sortable: false,
      valueFormatter: params => params?.value?.name,
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
      valueFormatter: params =>
        params.value > 1000000
          ? (params.value / 1000000).toFixed(1) + 'M'
          : params.value > 1000
            ? (params.value / 1000) + 'K'
            : params.value
    },
    {
      field: 'date_expired',
      headerName: 'Expires',
      width: 120,
      valueFormatter: params => formatDistanceToNowStrict(
        new Date(params.value),
        { addSuffix: true },
      ),
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
        <Box
          sx={{ height: 'auto', width: '100%' }}
          display="flex"
          justifyContent="center"
          alignItems="center"
        >
          {activeContracts ?
            <DataGrid
              rows={activeContracts}
              columns={columns}
              disableSelectionOnClick
              disableColumnMenu
              experimentalFeatures={{ newEditingApi: true }}
            />
            : <CircularProgress />
          }
        </Box>
      </CardContent>
    </Card>
    <Box sx={{ pb: 1, pt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Finished Contracts
      </Typography>
    </Box>
    <Card>
      <CardContent>
        <Box
          sx={{ height: 'auto', width: '100%' }}
          display="flex"
          justifyContent="center"
          alignItems="center"
        >
          {finishedContracts ?
            <DataGrid
              rows={finishedContracts}
              columns={columns}
              disableSelectionOnClick
              disableColumnMenu
              experimentalFeatures={{ newEditingApi: true }}
            />
            : <CircularProgress />
          }
        </Box>
      </CardContent>
    </Card>
  </div>;
}