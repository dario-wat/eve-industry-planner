import useAxios from 'axios-hooks';
import { useState } from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import { WalletTransactionsRes } from '@internal/shared';
import EveIconAndName from 'components/util/EveIconAndName';
import { format } from 'date-fns';

// TODO finish
export default function MarketPage() {
  const [{ data }] = useAxios<WalletTransactionsRes>('/wallet_transactions');

  const [searchText, setSearchText] = useState('');

  const isIncluded = (s: string) =>
    s.toLowerCase().includes(searchText.toLowerCase());
  const filteredData = data && data.filter(d =>
    (d.name && isIncluded(d.name))
    || (d.locationName && isIncluded(d.locationName))
  );

  // const moneyFormatter = new Intl.NumberFormat();

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
      field: 'quantity',
      headerName: 'Quantity',
      width: 100,
      align: 'right',
      sortable: false,
    },
    {
      field: 'unitPrice',
      headerName: 'Unit Price',
      width: 100,
      align: 'right',
      sortable: false,
      valueFormatter: params => params.value.toLocaleString('en-US'),
    },
    {
      field: 'total',
      headerName: 'Total',
      width: 100,
      align: 'right',
      sortable: false,
      renderCell: params =>
        <div style={{
          color: params.row.isBuy ? 'red' : 'green',
          fontWeight: 'bold',
        }}>
          {(params.row.quantity * params.row.unitPrice).toLocaleString('en-US')}
        </div>,
    },
    {
      field: 'locationName',
      headerName: 'Location',
      width: 350,
      sortable: false,
    },
    {
      field: 'date',
      headerName: 'Time',
      width: 150,
      sortable: false,
      valueFormatter: params => format(
        new Date(params.value),
        'yyyy.MM.dd - HH:mm',
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
    </div>
  );
}