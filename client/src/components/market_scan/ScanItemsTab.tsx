import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  formatIsk,
  formatMaybe,
  formatNumber,
  formatNumberScale,
  formatShare,
} from 'common/format';
import { WorkspaceFill } from 'components/util/WorkspacePage';
import { ScanRow } from './marketHistoryScan';
import { ItemCell, SignedPercent } from './scanCells';

const columns: GridColDef<ScanRow>[] = [
  {
    field: 'name',
    headerName: 'Item',
    flex: 1.4,
    minWidth: 220,
    renderCell: (params) => (
      <ItemCell typeId={params.row.typeId} categoryId={params.row.categoryId} name={params.row.name} />
    ),
  },
  numberColumn('medianIsk', 'Median ISK/day', 140, formatIsk,
    'Median of each day\'s volume times that day\'s average price.'),
  numberColumn('medianOrders', 'Median orders', 130, formatCount,
    'Median number of trades per day. Days with no trades count as zero.'),
  {
    field: 'daysTraded',
    headerName: 'Days traded',
    minWidth: 120,
    align: 'right',
    headerAlign: 'right',
    description: 'Days in the window that had at least one trade.',
    renderCell: (params) => `${params.row.daysTraded} / ${params.row.windowDays}`,
  },
  {
    field: 'priceChange',
    headerName: 'Price change',
    minWidth: 130,
    align: 'right',
    headerAlign: 'right',
    description: 'Median traded price compared with the previous window of the same length.',
    renderCell: (params) => <SignedPercent value={params.row.priceChange} />,
  },
  {
    field: 'medianRange',
    headerName: 'Median range',
    minWidth: 130,
    align: 'right',
    headerAlign: 'right',
    description: 'Each day\'s high minus its low, divided by that day\'s high. The cell is the median of those days.',
    renderCell: (params) => formatMaybe(params.row.medianRange, formatShare),
  },
  numberColumn('medianUnits', 'Median units/day', 150, formatNumberScale),
];

export default function ScanItemsTab(props: { rows: ScanRow[]; onOpen: (typeId: number) => void }) {
  return (
    <WorkspaceFill>
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
          sorting: { sortModel: [{ field: 'medianIsk', sort: 'desc' }] },
        }}
        onRowClick={(params) => props.onOpen(params.row.typeId)}
        sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
      />
    </WorkspaceFill>
  );
}

function formatCount(value: number): string {
  return formatNumber(value, value >= 100 ? 0 : 1);
}

function numberColumn(
  field: keyof ScanRow,
  headerName: string,
  minWidth: number,
  formatValue: (value: number) => string,
  description?: string,
): GridColDef<ScanRow> {
  return {
    field,
    headerName,
    minWidth,
    align: 'right',
    headerAlign: 'right',
    description,
    renderCell: (params) => {
      const value = params.row[field];
      return typeof value === 'number' ? formatValue(value) : '—';
    },
  };
}
