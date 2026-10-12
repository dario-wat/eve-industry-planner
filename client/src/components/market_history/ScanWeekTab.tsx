import { useMemo } from 'react';
import { Box } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { MarketHistoryScanRes } from '@internal/shared';
import { formatIsk } from 'common/format';
import { WorkspaceSection } from 'components/util/WorkspacePage';
import { ScanRow, WeekMove, weekMoves } from './marketHistoryScan';
import { ItemCell, SignedPercent } from './scanCells';

const columns: GridColDef<WeekMove>[] = [
  {
    field: 'name',
    headerName: 'Item',
    flex: 1,
    minWidth: 180,
    renderCell: (params) => (
      <ItemCell typeId={params.row.typeId} categoryId={params.row.categoryId} name={params.row.name} />
    ),
  },
  {
    field: 'priceChange',
    headerName: '7d price change',
    minWidth: 140,
    align: 'right',
    headerAlign: 'right',
    description: 'Median traded price over the last 7 days compared with the previous 7 days.',
    renderCell: (params) => <SignedPercent value={params.row.priceChange} />,
  },
  {
    field: 'medianIsk',
    headerName: '7d median ISK/day',
    minWidth: 150,
    align: 'right',
    headerAlign: 'right',
    description: 'Median of each day\'s volume times that day\'s average price, over the last 7 days. Days with no trades count as zero.',
    renderCell: (params) => formatIsk(params.row.medianIsk),
  },
];

export default function ScanWeekTab(props: {
  data: MarketHistoryScanRes;
  rows: ScanRow[];
  onOpen: (typeId: number) => void;
}) {
  const moves = useMemo(
    () => weekMoves(props.data, props.rows),
    [props.data, props.rows],
  );

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', gap: 1 }}>
      <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex' }}>
        <WorkspaceSection title="Gainers">
          <WeekGrid rows={moves.gainers} priceSort="desc" onOpen={props.onOpen} />
        </WorkspaceSection>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex' }}>
        <WorkspaceSection title="Losers">
          <WeekGrid rows={moves.losers} priceSort="asc" onOpen={props.onOpen} />
        </WorkspaceSection>
      </Box>
    </Box>
  );
}

function WeekGrid(props: {
  rows: WeekMove[];
  priceSort: 'asc' | 'desc';
  onOpen: (typeId: number) => void;
}) {
  return (
    <DataGrid
      rows={props.rows}
      columns={columns}
      getRowId={(row) => row.typeId}
      autoHeight={false}
      density="compact"
      disableRowSelectionOnClick
      disableColumnMenu
      pageSizeOptions={[25, 50, 100]}
      initialState={{
        pagination: { paginationModel: { pageSize: 100, page: 0 } },
        sorting: { sortModel: [{ field: 'priceChange', sort: props.priceSort }] },
      }}
      onRowClick={(params) => props.onOpen(params.row.typeId)}
      sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
    />
  );
}
