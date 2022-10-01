import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import useAxios from 'axios-hooks';
import { formatDistanceToNowStrict } from 'date-fns';
import { useContext, useState } from 'react';
import { EveContractsRes } from '@internal/shared';
import { UserContext } from 'contexts/UserContext';

const FINISHED_STATUS = 'finished';

export default function ContractsPage() {
  const [{ data }] = useAxios<EveContractsRes>('/contracts');

  const userContext = useContext(UserContext);

  const [searchText, setSearchText] = useState('');

  const isIncluded = (s: string) =>
    s.toLowerCase().includes(searchText.toLowerCase());
  const filteredData = data && data.filter(d =>
    (d.acceptor && isIncluded(d.acceptor.name))
    || (d.assignee && isIncluded(d.assignee.name))
    || (d.issuer && isIncluded(d.issuer.name))
    || (d.title && isIncluded(d.title))
  );

  const finishedContracts = filteredData &&
    filteredData.filter((c: any) => c.status === FINISHED_STATUS);
  const activeContracts = filteredData &&
    filteredData.filter((c: any) => c.status !== FINISHED_STATUS);

  const emphasizeSelf = (characterId: number | null, text: string) =>
    userContext.is_logged_in && userContext.character_id === characterId
      ?
      <div style={{ color: 'orange' }}>
        {text}
      </div>
      : text;

  const columns = (dateField: GridColDef): GridColDef[] => ([
    {
      field: 'issuer',
      headerName: 'Issuer',
      width: 150,
      sortable: false,
      valueGetter: params => params?.value?.name,
      renderCell: params => emphasizeSelf(params.row.issuer?.id, params.value),
    },
    {
      field: 'assignee',
      headerName: 'Assignee',
      width: 150,
      sortable: false,
      valueGetter: params => params?.value?.name,
      renderCell: params => emphasizeSelf(params.row.assignee?.id, params.value),
    },
    {
      field: 'acceptor',
      headerName: 'Acceptor',
      width: 150,
      sortable: false,
      valueGetter: params => params?.value?.name,
      renderCell: params => emphasizeSelf(params.row.acceptor?.id, params.value),
    },
    {
      field: 'title',
      headerName: 'Title',
      width: 300,
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
    dateField,  // Inject date field here
    {
      field: 'type',
      headerName: 'Type',
      width: 130,
      sortable: false,
    },
  ]);

  const columnsActive = columns(
    {
      field: 'date_expired',
      headerName: 'Expires',
      width: 120,
      sortable: false,
      valueFormatter: params => formatDistanceToNowStrict(
        new Date(params.value),
        { addSuffix: true },
      ),
    },
  );
  const columnsFinished = columns(
    {
      field: 'date_accepted',
      headerName: 'Accepted',
      width: 120,
      sortable: false,
      valueFormatter: params => formatDistanceToNowStrict(
        new Date(params.value),
        { addSuffix: true },
      ),
    },
  );
  return <div>
    <Box sx={{ pb: 2 }}>
      <TextField
        InputProps={{
          sx: {
            backgroundColor: 'white',
          }
        }}
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
              initialState={{
                sorting: {
                  sortModel: [{ field: 'date_expired', sort: 'asc' }],
                },
              }}
              hideFooter={true}
              rows={activeContracts}
              columns={columnsActive}
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
              initialState={{
                sorting: {
                  sortModel: [{ field: 'date_accepted', sort: 'desc' }],
                },
              }}
              rows={finishedContracts}
              columns={columnsFinished}
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