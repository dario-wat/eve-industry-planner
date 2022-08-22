import { DataGrid, GridColDef } from '@mui/x-data-grid';
import CircularProgress from '@mui/material/CircularProgress';
import {
  Box,
  TextField
} from '@mui/material';
import { useLocalhostAxios } from 'lib/util'
import { useState } from 'react';

// TODO
//  2. Asset count
//  3. Icons ?
//  4. Header row styling
//  5. Asset caching
export default function AssetsPage() {
  const [{ data }] = useLocalhostAxios('/assets');

  const [searchText, setSearchText] = useState('');

  const indexedData =
    data && data.map((d: any, i: number) => ({ id: i, ...d }));
  const filteredData = indexedData && indexedData.filter((d: any) =>
    (d.name && d.name.toLowerCase().includes(searchText.toLowerCase()))
    || (d.location && d.location.toLowerCase().includes(searchText.toLowerCase()))
  );

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      width: 400,
      sortable: false,
    },
    {
      field: 'quantity',
      headerName: 'Quantity',
      width: 100,
      sortable: false,
    },
    {
      field: 'location',
      headerName: 'Location',
      width: 500,
      sortable: false,
    },
  ];

  return (
    <div>
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
    </div>
  )
}
