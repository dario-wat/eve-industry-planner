import { MarketabilityRes } from '@internal/shared';
import { Box, CircularProgress, TextField } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import useAxios from 'axios-hooks';
import EveIconAndName from 'components/util/EveIconAndName';
import { ColoredNumber, formatNumber } from 'components/util/numbers';
import { useState } from 'react';

const GOOD_AVG_DIFF = 0.1;
const GOOD_AVG_PRICE = 10000000;  // 10M
const GOOD_AVG_ISK_VOLUME = 10000000000;  // 10B
const GOOD_AVG_LINE_DIFF = [0.3, 0.7];

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
    field: 'avgDiff',
    headerName: 'Avg Diff %',
    width: 100,
    align: 'right',
    renderCell: params =>
      <ColoredNumber
        color={params.value > GOOD_AVG_DIFF ? 'green' : 'red'}
        number={params.value * 100}
        fractionDigits={2}
      />
  },
  {
    field: 'avgPrice',
    headerName: 'Avg Price',
    width: 150,
    align: 'right',
    renderCell: params =>
      <ColoredNumber
        color={params.value > GOOD_AVG_PRICE ? 'green' : 'red'}
        number={params.value}
      />
  },
  {
    field: 'avgIskVolume',
    headerName: 'Avg ISK Volume',
    width: 150,
    align: 'right',
    renderCell: params =>
      <ColoredNumber
        color={params.value > GOOD_AVG_ISK_VOLUME ? 'green' : 'red'}
        number={params.value}
      />
  },
  {
    field: 'avgAvgLineDiff',
    headerName: 'Avg Line Diff',
    width: 120,
    align: 'right',
    renderCell: params =>
      <ColoredNumber
        color={
          params.value > GOOD_AVG_LINE_DIFF[0] && params.value < GOOD_AVG_LINE_DIFF[1]
            ? 'green'
            : 'red'
        }
        number={params.value}
        fractionDigits={2}
      />
  },
  {
    field: 'avgVolume',
    headerName: 'Avg Volume',
    width: 120,
    align: 'right',
    renderCell: params => formatNumber(params.value)
  },
];

export default function MarketabiltyTab() {
  const [{ data }] = useAxios<MarketabilityRes>('/marketability');

  const [minDiff, setMinDiff] = useState('0.09');
  const [minPrice, setMinPrice] = useState((5 * 1e6).toString());
  const [minIskVolume, setMinIskVolume] = useState((2 * 1e9).toString());
  const [searchText, setSearchText] = useState('');

  const rowData = data?.map(d => ({
    typeId: d.typeId,
    name: d.name,
    categoryId: d.categoryId,
    ...d.scores.map(s => ({ [s.name]: s.value }))
      .reduce((acc, obj) => ({ ...acc, ...obj }), {}),
  }))?.filter(d =>
    // @ts-ignore
    d.avgDiff > Number(minDiff)
    // @ts-ignore
    && d.avgPrice > Number(minPrice)
    // @ts-ignore
    && d.avgIskVolume > Number(minIskVolume)
    && d.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ p: 2, gap: 1 }} display="flex">
        <TextField
          sx={{ width: 150 }}
          label="Min Diff"
          variant="outlined"
          value={minDiff}
          onChange={e => setMinDiff(e.target.value)}
        />
        <TextField
          sx={{ width: 150 }}
          label="Min Price"
          variant="outlined"
          value={minPrice}
          onChange={e => setMinPrice(e.target.value)}
        />
        <TextField
          sx={{ width: 150 }}
          label="Min Isk Volume"
          variant="outlined"
          value={minIskVolume}
          onChange={e => setMinIskVolume(e.target.value)}
        />
        <TextField
          sx={{ width: 200 }}
          label="Search"
          variant="outlined"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
      </Box>
      <Box
        sx={{ height: 'auto', width: '100%' }}
        display="flex"
        justifyContent="center"
        alignItems="center"
      >
        {rowData
          ? (
            <DataGrid
              rows={rowData}
              columns={columns}
              disableRowSelectionOnClick
              disableColumnMenu
            />
          )
          : <CircularProgress />
        }
      </Box>
    </Box>
  );
}