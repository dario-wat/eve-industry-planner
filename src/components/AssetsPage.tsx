import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Box,
  TextField
} from '@mui/material';
import { useLocalhostAxios } from 'lib/util'
import { useState } from "react";

export default function AssetsPage() {
  const [{ data }] = useLocalhostAxios('/assets');

  const [searchText, setSearchText] = useState('');

  const indexedData = data && data.map((d: any, i: number) => ({ id: i, ...d }));
  // const filteredData = data && data.filter((d: any) =>
  //   d.name.toLowerCase().includes(searchText.toLowerCase())
  //   || d.location.toLowerCase().includes(searchText.toLowerCase())
  // );

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', width: 300 },
    {
      field: 'quantity',
      headerName: 'Quantity',
      width: 150,
    },
    {
      field: 'location',
      headerName: 'Location',
      width: 500,
    },
  ];

  return (
    <div>
      <TextField
        label="Search..."
        variant="outlined"
        value={searchText}
        onChange={e => setSearchText(e.target.value)}
      />
      {indexedData &&
        <Box sx={{ height: 400, width: '100%' }}>
          <DataGrid
            rows={indexedData}
            columns={columns}
            pageSize={100}
            rowsPerPageOptions={[100]}
            disableSelectionOnClick
            experimentalFeatures={{ newEditingApi: true }}
          />
        </Box>
      }
    </div>
  )
}
