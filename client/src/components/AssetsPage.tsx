import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import useAxios from 'axios-hooks';
import { EveAssetsRes } from '@internal/shared';
import EveIconAndName from 'components/util/EveIconAndName';
import WorkspacePage, { WorkspaceFill, WorkspaceSpinner } from 'components/util/WorkspacePage';

export default function AssetsPage() {
  const [{ data }] = useAxios<EveAssetsRes>('/assets');

  const [searchText, setSearchText] = useState('');

  const isIncluded = (s: string) =>
    s.toLowerCase().includes(searchText.toLowerCase());
  const filteredData = data && data.filter(d =>
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
          typeId={params.row.typeId}
          categoryId={params.row.categoryId}
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
    {
      field: 'character_name',
      headerName: 'Character',
      width: 200,
      sortable: false,
    },
  ];

  return (
    <WorkspacePage>
      <Box sx={{ pb: 1, flexShrink: 0 }}>
        <TextField
          label="Search..."
          variant="outlined"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
      </Box>
      <WorkspaceFill>
        {filteredData ?
          <DataGrid
            autoHeight={false}
            rows={filteredData}
            columns={columns}
            disableRowSelectionOnClick
            disableColumnMenu
          />
          : <WorkspaceSpinner />
        }
      </WorkspaceFill>
    </WorkspacePage>
  )
}
