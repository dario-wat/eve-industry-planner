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

// TODO finish
export default function MarketPage() {
  const [{ data }] = useAxios<WalletTransactionsRes>('/wallet_transactions');

  const [searchText, setSearchText] = useState('');

  const isIncluded = (s: string) =>
    s.toLowerCase().includes(searchText.toLowerCase());
  const filteredData = data && data.filter((d: any) =>
    (d.name && isIncluded(d.name)) || (d.locationName && isIncluded(d.location))
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
      field: 'unitPrice',
      headerName: 'Unit Price',
      width: 100,
      sortable: false,
    },
    {
      field: 'total',
      headerName: 'Total',
      width: 100,
      sortable: false,
      renderCell: params =>
        <div style={{ color: params.row.isBuy ? 'red' : 'green' }}>
          {params.row.quantity * params.row.unitPrice}
        </div>,
    },
    {
      field: 'locationName',
      headerName: 'Location',
      width: 500,
      sortable: false,
    },
    // TODO add date
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