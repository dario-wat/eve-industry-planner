import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import useAxios from 'axios-hooks';
import {
  Box,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { MarketHistoryScanRes } from '@internal/shared';
import {
  formatIsk,
  formatMaybe,
  formatNumber,
  formatShare,
  formatSignedPercent,
} from 'common/format';
import EveIcon from 'components/util/EveIcon';
import WorkspacePage, { WorkspaceFill, WorkspaceSpinner } from 'components/util/WorkspacePage';
import {
  SCAN_WINDOWS,
  ScanRow,
  ScanWindowDays,
  categoryNames,
  filterScanRows,
  parseIskMillions,
  parsePercent,
  rowsForWindow,
} from './marketHistoryScan';

const DEFAULT_WINDOW_DAYS: ScanWindowDays = 30;
const DEFAULT_CATEGORY_NAME = 'All';
const DEFAULT_MIN_DAYS_TEXT = '70';
const DEFAULT_MIN_ISK_TEXT = '1000';

const columns: GridColDef<ScanRow>[] = [
  {
    field: 'name',
    headerName: 'Item',
    flex: 1.4,
    minWidth: 220,
    renderCell: (params) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, overflow: 'hidden' }}>
        <EveIcon typeId={params.row.typeId} categoryId={params.row.categoryId ?? 0} size={24} />
        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {params.row.name}
        </Box>
      </Box>
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
  numberColumn('medianUnits', 'Median units/day', 150, (value) => formatNumber(value)),
];

export default function MarketHistoryScanPage() {
  const navigate = useNavigate();
  const [{ data, loading, error }] = useAxios<MarketHistoryScanRes>('/market_history/scan');
  const [windowDays, setWindowDays] = useState<ScanWindowDays>(DEFAULT_WINDOW_DAYS);
  const [categoryName, setCategoryName] = useState(DEFAULT_CATEGORY_NAME);
  const [minDaysText, setMinDaysText] = useState(DEFAULT_MIN_DAYS_TEXT);
  const [minIskText, setMinIskText] = useState(DEFAULT_MIN_ISK_TEXT);
  const [minRangeText, setMinRangeText] = useState('');
  const [search, setSearch] = useState('');

  const rows = useMemo(
    () => (data == null ? [] : rowsForWindow(data, windowDays)),
    [data, windowDays],
  );
  const categories = useMemo(() => categoryNames(rows), [rows]);
  const categoryValue = categories.includes(categoryName) ? categoryName : DEFAULT_CATEGORY_NAME;
  const visible = useMemo(
    () => filterScanRows(rows, {
      categoryName: categoryValue,
      minDaysShare: parsePercent(minDaysText),
      minIsk: parseIskMillions(minIskText),
      minRange: parsePercent(minRangeText),
      search,
    }),
    [rows, categoryValue, minDaysText, minIskText, minRangeText, search],
  );

  if (loading && data == null) {
    return (
      <WorkspacePage>
        <WorkspaceSpinner />
      </WorkspacePage>
    );
  }

  if (error != null || data == null) {
    return (
      <WorkspacePage>
        <Typography color="error" sx={{ p: 1 }}>Could not load the market scan.</Typography>
      </WorkspacePage>
    );
  }

  return (
    <WorkspacePage>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0, pb: 1 }}>
        <TextField
          size="small"
          label="Search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ width: 180 }}
        />
        <TextField
          select
          size="small"
          label="Category"
          value={categoryValue}
          onChange={(event) => setCategoryName(event.target.value)}
          sx={{ width: 200 }}
        >
          {categories.map((name) => (
            <MenuItem key={name} value={name}>{name}</MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label="Days traded %"
          value={minDaysText}
          onChange={(event) => setMinDaysText(event.target.value)}
          sx={{ width: 130 }}
        />
        <TextField
          size="small"
          label="Min M ISK/day"
          value={minIskText}
          onChange={(event) => setMinIskText(event.target.value)}
          sx={{ width: 160 }}
        />
        <TextField
          size="small"
          label="Min range %"
          value={minRangeText}
          onChange={(event) => setMinRangeText(event.target.value)}
          sx={{ width: 120 }}
        />
        <ToggleButtonGroup
          exclusive
          size="small"
          value={windowDays}
          onChange={(_, value: ScanWindowDays | null) => {
            if (value != null) {
              setWindowDays(value);
            }
          }}
        >
          {SCAN_WINDOWS.map((days) => (
            <ToggleButton key={days} value={days}>{days}d</ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Typography variant="body2" color="text.secondary">
          The Forge
          {data.asOfDate !== '' ? ` · ${formatDay(data.asOfDate)}` : ''}
          {visible.length === rows.length
            ? ` · ${formatNumber(rows.length)} types`
            : ` · ${formatNumber(visible.length)} of ${formatNumber(rows.length)} types`}
        </Typography>
      </Box>
      <WorkspaceFill>
        <DataGrid
          rows={visible}
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
          onRowClick={(params) => {
            navigate(`/market_history?typeId=${params.row.typeId}`);
          }}
          sx={{
            '& .MuiDataGrid-row': { cursor: 'pointer' },
          }}
        />
      </WorkspaceFill>
    </WorkspacePage>
  );
}

function SignedPercent(props: { value: number | null }) {
  if (props.value == null) {
    return <span>—</span>;
  }
  const color = props.value > 0 ? 'success.main' : props.value < 0 ? 'error.main' : 'text.primary';
  return (
    <Box component="span" sx={{ color, fontVariantNumeric: 'tabular-nums' }}>
      {formatSignedPercent(props.value)}
    </Box>
  );
}

function formatDay(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (year == null || month == null || day == null || Number.isNaN(year)) {
    return iso;
  }
  return format(new Date(year, month - 1, day), 'd MMM yyyy');
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
