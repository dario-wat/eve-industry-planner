import { DataGrid, GridColDef } from '@mui/x-data-grid';
import CircularProgress from '@mui/material/CircularProgress';
import {
  Box,
  Card,
  CardContent,
  TextField
} from '@mui/material';
import { useLocalhostAxios } from 'lib/util'
import { useState } from 'react';

// TODO
//  - Icons ?
//  - Header row styling
//  - Asset caching
//  - styling for cells
export default function AssetsPage() {
  const [{ data }] = useLocalhostAxios('/assets');

  const [searchText, setSearchText] = useState('');

  const indexedData =
    data && data.map((d: any, i: number) => ({ id: i, ...d }));

  const isIncluded = (s: string) =>
    s.toLowerCase().includes(searchText.toLowerCase());
  const filteredData = indexedData && indexedData.filter((d: any) =>
    (d.name && isIncluded(d.name)) || (d.location && isIncluded(d.location))
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
      <Card>
        <CardContent>
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
        </CardContent>
      </Card>

    </div >
  )
}
