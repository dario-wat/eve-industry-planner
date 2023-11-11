import { MarketabilityRes } from '@internal/shared';
import { Box, CircularProgress } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import useAxios from 'axios-hooks';
import EveIconAndName from 'components/util/EveIconAndName';
import { ColoredNumber } from 'components/util/numbers';

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
];

export default function MarketabiltyTab() {
  const [{ data }] = useAxios<MarketabilityRes>('/marketability');

  const rowData = data?.map(d => ({
    typeId: d.typeId,
    name: d.name,
    categoryId: d.categoryId,
    ...d.scores.map(s => ({ [s.name]: s.value }))
      .reduce((acc, obj) => ({ ...acc, ...obj }), {}),
  }));

  return (
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
            disableSelectionOnClick
            disableColumnMenu
          />
        )
        : <CircularProgress />
      }
    </Box>
  );
}