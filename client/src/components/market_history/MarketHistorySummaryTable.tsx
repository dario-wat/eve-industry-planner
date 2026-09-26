import { Box, Tooltip } from '@mui/material';
import HelpIcon from '@mui/icons-material/Help';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  formatIsk,
  formatMaybe,
  formatNumber,
  formatShare,
  formatSignedPercent,
} from 'common/format';
import {
  MarketHistoryDay,
  WindowSummary,
  summarizeWindow,
} from './marketHistoryStats';

const WINDOW_FIELDS = [
  { field: 'd7', headerName: '7 days', windowDays: 7 },
  { field: 'd30', headerName: '30 days', windowDays: 30 },
  { field: 'd90', headerName: '90 days', windowDays: 90 },
] as const;

const METRIC_HELP: Partial<Record<string, string>> = {
  priceChange: 'Median traded price compared with the previous window of the same length.',
  medianRange: 'Each day\'s high minus its low, divided by that day\'s high. '
    + 'The cell is the median of those days. Days with no trades are left out. '
    + 'A day that traded at a single price is 0%.',
  iskWeightedRange: 'The same daily high-to-low divided by the high, '
    + 'with each day weighted by the ISK traded that day. '
    + 'A day with more ISK moves the number more. Days with no trades are left out.',
  priceInRange: 'Where the day\'s average price sat between that day\'s low and high. '
    + '0% is the low and 100% is the high. The cell is the median of those days. '
    + 'Days with no trades, and days where the high and low were the same, are left out.',
};

const summaryColumns: GridColDef[] = [
  {
    field: 'metric',
    headerName: 'Metric',
    flex: 1.4,
    minWidth: 130,
    sortable: false,
    renderCell: params => {
      const help = METRIC_HELP[String(params.row.id)];
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
          <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {params.value}
          </Box>
          {help != null &&
            <Tooltip title={help}>
              <Box component="span" sx={{ display: 'inline-flex', flexShrink: 0 }}>
                <HelpIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              </Box>
            </Tooltip>
          }
        </Box>
      );
    },
  },
  ...WINDOW_FIELDS.map((column): GridColDef => ({
    field: column.field,
    headerName: column.headerName,
    flex: 1,
    minWidth: 72,
    align: 'right' as const,
    headerAlign: 'right' as const,
    sortable: false,
    // A custom renderer stops the grid from setting a native title tooltip.
    renderCell: params => params.value,
  })),
];

export default function MarketHistorySummaryTable(props: { days: MarketHistoryDay[] }) {
  const summaries = WINDOW_FIELDS.map(column => summarizeWindow(props.days, column.windowDays));
  const rows = [
    metricRow('medianPrice', 'Median price', summaries, summary =>
      formatMaybe(summary.medianPrice, formatIsk)),
    metricRow('priceChange', 'Price change', summaries, summary =>
      formatMaybe(summary.priceChange, formatSignedPercent)),
    metricRow('medianUnits', 'Median units / day', summaries, summary =>
      formatNumber(summary.medianUnits)),
    metricRow('medianIsk', 'Median ISK / day', summaries, summary =>
      formatIsk(summary.medianIsk)),
    metricRow('medianOrders', 'Median orders', summaries, summary =>
      formatNumber(summary.medianOrders, summary.medianOrders >= 100 ? 0 : 1)),
    metricRow('daysTraded', 'Days traded', summaries, summary =>
      `${summary.daysTraded} / ${summary.windowDays}`),
    metricRow('medianRange', 'Median range', summaries, summary =>
      formatMaybe(summary.medianRange, formatShare)),
    metricRow('iskWeightedRange', 'ISK-weighted range', summaries, summary =>
      formatMaybe(summary.iskWeightedRange, formatShare)),
    metricRow('priceInRange', 'Price in range', summaries, summary =>
      formatMaybe(summary.medianPriceInRange, formatShare)),
  ];

  return (
    <DataGrid
      rows={rows}
      columns={summaryColumns}
      getRowId={row => row.id}
      disableRowSelectionOnClick
      disableColumnMenu
      hideFooter
    />
  );
}

function metricRow(
  id: string,
  metric: string,
  summaries: (WindowSummary | null)[],
  formatSummary: (summary: WindowSummary) => string,
) {
  const cells = Object.fromEntries(WINDOW_FIELDS.map((column, index) => {
    const summary = summaries[index];
    return [column.field, summary == null ? '—' : formatSummary(summary)];
  }));
  return { id, metric, ...cells };
}
