import useAxios from 'axios-hooks';
import { useState } from 'react';
import { sum } from 'mathjs';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import { WalletTransactionsRes } from '@internal/shared';
import EveIconAndName from 'components/util/EveIconAndName';
import { format } from 'date-fns';
import { groupBy } from 'underscore';

export default function MarketTransactionsPage() {
  const [{ data }] = useAxios<WalletTransactionsRes>('/wallet_transactions');

  const [groupTransactions, setGroupTransactions] = useState(false);

  const [searchText, setSearchText] = useState('');

  const isIncluded = (s: string) =>
    s.toLowerCase().includes(searchText.toLowerCase());
  const filteredData = data && data.filter(d =>
    (d.name && isIncluded(d.name))
    || (d.locationName && isIncluded(d.locationName))
  );

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
        <FormControlLabel
          sx={{ pl: 2 }}
          control={
            <Switch
              checked={groupTransactions}
              onChange={e => setGroupTransactions(e.target.checked)}
            />
          }
          label="Aggregate Transactions"
          labelPlacement="start"
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
            {groupTransactions
              ? <GroupedTransactionDataGrid data={filteredData} />
              : <FlatTransactionDataGrid data={filteredData} />
            }
          </Box>
        </CardContent>
      </Card>
    </div>
  );
}

function FlatTransactionDataGrid(props: {
  data: WalletTransactionsRes | undefined,
}) {
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
    <>
      {props.data
        ?
        <DataGrid
          rows={props.data}
          columns={columns}
          disableSelectionOnClick
          disableColumnMenu
          experimentalFeatures={{ newEditingApi: true }}
        />
        : <CircularProgress />
      }
    </>
  );
}

function GroupedTransactionDataGrid(props: {
  data: WalletTransactionsRes | undefined,
}) {
  if (props.data === undefined) {
    return <CircularProgress />;
  }

  // Only care about sell transactions
  const aggregatedData = Object.entries(
    groupBy(props.data.filter(t => !t.isBuy), 'typeId'),
  ).map(d => {
    const totalQuantity = sum(d[1].map(t => t.quantity));
    const totalPrice = sum(d[1].map(t => t.quantity * t.unitPrice));
    return {
      averagePrice: totalPrice / totalQuantity,
      totalPrice,
      totalQuantity,
      typeId: d[1][0].typeId,
      categoryId: d[1][0].categoryId,
      name: d[1][0].name,
    };
  });

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
      field: 'totalQuantity',
      headerName: 'Quantity',
      width: 100,
      align: 'right',
      sortable: true,
    },
    {
      field: 'averagePrice',
      headerName: 'Average Price',
      width: 150,
      align: 'right',
      sortable: true,
      renderCell: params =>
        <div style={{ color: 'green', fontWeight: 'bold' }}>
          {params.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </div>,
    },
    {
      field: 'totalPrice',
      headerName: 'Total',
      width: 150,
      align: 'right',
      sortable: true,
      renderCell: params =>
        <div style={{ color: 'green', fontWeight: 'bold' }}>
          {params.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </div>,
    },
  ];

  return (
    <DataGrid
      rows={aggregatedData}
      columns={columns}
      disableSelectionOnClick
      disableColumnMenu
      experimentalFeatures={{ newEditingApi: true }}
    />
  );
}