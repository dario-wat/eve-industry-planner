import useAxios from 'axios-hooks';
import { useState } from 'react';
import { addDays, formatDistanceToNowStrict } from 'date-fns';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { MarketOrdersRes } from '@internal/shared';
import EveIconAndName from 'components/util/EveIconAndName';
import WorkspacePage, { WorkspaceSection, WorkspaceSpinner } from 'components/util/WorkspacePage';

export default function MarketOrdersPage() {
  const [{ data }] = useAxios<MarketOrdersRes>('/market_orders');

  const [searchText, setSearchText] = useState('');

  const isIncluded = (s: string) =>
    s.toLowerCase().includes(searchText.toLowerCase());
  const filteredData = data && data.filter(d =>
    (d.name && isIncluded(d.name))
    || (d.locationName && isIncluded(d.locationName))
  );

  const buyOrders = filteredData && filteredData.filter(o => o.isBuy);
  const sellOrders = filteredData && filteredData.filter(o => !o.isBuy);

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      width: 300,
      sortable: false,
      renderCell: params =>
        <EveIconAndName
          typeId={params.row.typeId}
          categoryId={params.row.categoryId}
          name={params.row.name}
        />,
    },
    {
      field: 'volume',
      headerName: 'Volume',
      width: 150,
      align: 'right',
      sortable: false,
      valueGetter: (value, row) =>
        row.volumeRemain + ' / ' + row.volumeTotal,
    },
    {
      field: 'price',
      headerName: 'Price',
      width: 100,
      align: 'right',
      sortable: false,
      valueFormatter: (value: any) => value.toLocaleString('en-US'),
    },
    {
      field: 'locationName',
      headerName: 'Location',
      width: 350,
      sortable: false,
    },
    {
      field: 'expires',
      headerName: 'Expires',
      width: 100,
      sortable: false,
      valueGetter: (value, row) => formatDistanceToNowStrict(
        addDays(new Date(row.issuedDate), row.duration),
        { addSuffix: true, unit: 'day' }
      ),
    },
    {
      field: 'characterName',
      headerName: 'Character',
      width: 150,
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
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <WorkspaceSection title="Sell Orders">
          {sellOrders ?
            <DataGrid
              autoHeight={false}
              rows={sellOrders}
              columns={columns}
              disableRowSelectionOnClick
              disableColumnMenu
            />
            : <WorkspaceSpinner />
          }
        </WorkspaceSection>
        <WorkspaceSection title="Buy Orders">
          {buyOrders ?
            <DataGrid
              autoHeight={false}
              rows={buyOrders}
              columns={columns}
              disableRowSelectionOnClick
              disableColumnMenu
            />
            : <WorkspaceSpinner />
          }
        </WorkspaceSection>
      </Box>
    </WorkspacePage>
  );
}