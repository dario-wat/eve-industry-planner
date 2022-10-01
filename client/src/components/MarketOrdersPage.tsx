import useAxios from 'axios-hooks';
import { useState } from 'react';
import { addDays, formatDistanceToNowStrict } from 'date-fns';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { MarketOrdersRes } from '@internal/shared';
import EveIconAndName from 'components/util/EveIconAndName';

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
      width: 350,
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
      width: 180,
      align: 'right',
      sortable: false,
      valueGetter: params =>
        params.row.volumeRemain + ' / ' + params.row.volumeTotal,
    },
    {
      field: 'price',
      headerName: 'Price',
      width: 100,
      align: 'right',
      sortable: false,
      valueFormatter: params => params.value.toLocaleString('en-US'),
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
      width: 150,
      sortable: false,
      valueGetter: params => formatDistanceToNowStrict(
        addDays(new Date(params.row.issuedDate), params.row.duration),
        { addSuffix: true, unit: 'day' }
      ),
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
          <Box sx={{ pb: 1 }}>
            <Typography variant="h6" gutterBottom>
              Sell Orders
            </Typography>
          </Box>
          <Box
            sx={{ height: 'auto', width: '100%' }}
            display="flex"
            justifyContent="center"
            alignItems="center"
          >
            {sellOrders ?
              <DataGrid
                rows={sellOrders}
                columns={columns}
                disableSelectionOnClick
                disableColumnMenu
                experimentalFeatures={{ newEditingApi: true }}
              />
              : <CircularProgress />
            }
          </Box>
          <Box sx={{ pb: 1, pt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Buy Orders
            </Typography>
          </Box>
          <Box
            sx={{ height: 'auto', width: '100%' }}
            display="flex"
            justifyContent="center"
            alignItems="center"
          >
            {buyOrders ?
              <DataGrid
                rows={buyOrders}
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
    </div>
  );
}