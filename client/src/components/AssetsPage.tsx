import { DataGrid, GridColDef } from '@mui/x-data-grid';
import CircularProgress from '@mui/material/CircularProgress';
import {
  Box,
  Card,
  CardContent,
  TextField
} from '@mui/material';
import { useState } from 'react';
import useAxios from 'axios-hooks';
import { EveAssetsRes } from '@internal/shared';
import EveIconAndName from 'components/util/EveIconAndName';

// TODO
//  - group by location
export default function AssetsPage() {
  const [{ data }] = useAxios<EveAssetsRes>('/assets');

  const [searchText, setSearchText] = useState('');

  const isIncluded = (s: string) =>
    s.toLowerCase().includes(searchText.toLowerCase());
  const filteredData = data && data.filter((d: any) =>
    (d.name && isIncluded(d.name)) || (d.location && isIncluded(d.location))
  );

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      width: 400,
      sortable: false,
      renderCell: params =>
        <EveIconAndName
          typeId={params.row.type_id}
          categoryId={params.row.category_id}
          name={params.row.name}
        />,
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
      <Card>
        <CardContent>
          <Box
            sx={{ height: 'auto', width: '100%' }}
            display="flex"
            justifyContent="center"
            alignItems="center"
          >
            {filteredData ?
              <DataGrid
                rows={filteredData}
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
    </div >
  )
}
