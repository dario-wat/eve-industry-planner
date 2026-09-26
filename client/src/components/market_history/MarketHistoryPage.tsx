import { ReactNode, useMemo, useState } from 'react';
import { Box, Card, CardContent, MenuItem, TextField, Tooltip, Typography, useTheme } from '@mui/material';
import HelpIcon from '@mui/icons-material/Help';
import { LoadingButton } from '@mui/lab';
import axios from 'axios';
import { MarketHistoryRes } from '@internal/shared';
import { format } from 'date-fns';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  formatIsk,
  formatMaybe,
  formatNumber,
  formatShare,
  formatSignedPercent,
} from 'common/format';
import ItemAutocomplete from 'components/util/ItemAutocomplete';
import EChart from './EChart';
import {
  CHART_SPANS,
  ChartColors,
  ChartSpan,
  liquidityChartOption,
  priceChartOption,
  rangeChartOption,
} from './historyChartOptions';
import {
  MarketHistoryDay,
  WindowSummary,
  buildMarketHistoryDays,
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

export default function MarketHistoryPage() {
  const [typeId, setTypeId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<MarketHistoryRes | null>(null);
  const [span, setSpan] = useState<ChartSpan>('90d');
  const marketHistoryDays = useMemo(
    () => (historyData == null ? [] : buildMarketHistoryDays(historyData)),
    [historyData],
  );

  const onSubmit = async () => {
    if (typeId === null) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<MarketHistoryRes>(`/market_history/${typeId}`);
      setHistoryData(data);
    } catch {
      setHistoryData(null);
      setError('Could not load market history.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <ItemAutocomplete onSelect={setTypeId} width={350} />
            <LoadingButton
              loading={isLoading}
              disabled={typeId === null}
              variant="contained"
              color="primary"
              onClick={onSubmit}
            >
              Submit
            </LoadingButton>
            <TextField
              select
              size="small"
              label="Range"
              value={span}
              onChange={event => setSpan(event.target.value as ChartSpan)}
              sx={{ width: 140 }}
            >
              {CHART_SPANS.map(option => (
                <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>
              ))}
            </TextField>
            {marketHistoryDays.length > 0 &&
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1 }}>
                  The Forge · {format(marketHistoryDays[marketHistoryDays.length - 1].time, 'd MMM yyyy')}
                </Typography>
                <Tooltip title="Days with no trades are gaps in the price line and zero volume.">
                  <Box component="span" sx={{ display: 'inline-flex' }}>
                    <HelpIcon sx={{ fontSize: 16, color: 'text.secondary', position: 'relative', top: -1 }} />
                  </Box>
                </Tooltip>
              </Box>
            }
          </Box>
          {error &&
            <Typography color="error" sx={{ pt: 2, pl: 2 }}>
              {error}
            </Typography>
          }
          {marketHistoryDays.length > 0 &&
            <Box
              sx={{
                pt: 2,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 1.5,
              }}
            >
              <DashboardPanel title="Summary" help="Windows are calendar days ending on the latest trade date.">
                <SummaryTable days={marketHistoryDays} />
              </DashboardPanel>
              <HistoryCharts days={marketHistoryDays} span={span} />
            </Box>
          }
          {historyData != null && marketHistoryDays.length === 0 &&
            <Typography sx={{ pt: 2, pl: 2 }}>
              No market history for this type.
            </Typography>
          }
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryTable(props: { days: MarketHistoryDay[] }) {
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

function HistoryCharts(props: { days: MarketHistoryDay[]; span: ChartSpan }) {
  const theme = useTheme();
  const colors = useMemo<ChartColors>(() => ({
    band: withAlpha(theme.palette.grey[500], 0.28),
    edge: theme.palette.grey[600],
    average: theme.palette.primary.main,
    median7: theme.palette.warning.dark,
    median30: theme.palette.secondary.main,
    orders7: theme.palette.primary.main,
    orders30: theme.palette.success.main,
    text: theme.palette.text.primary,
    muted: theme.palette.text.secondary,
    divider: theme.palette.divider,
    paper: theme.palette.background.paper,
    fontFamily: theme.typography.fontFamily ?? 'sans-serif',
  }), [theme]);
  const priceOption = useMemo(
    () => priceChartOption(props.days, props.span, colors),
    [props.days, props.span, colors],
  );
  const liquidityOption = useMemo(
    () => liquidityChartOption(props.days, props.span, colors),
    [props.days, props.span, colors],
  );
  const rangeOption = useMemo(
    () => rangeChartOption(props.days, props.span, colors),
    [props.days, props.span, colors],
  );

  return (
    <>
      <DashboardPanel
        title="Price"
        help="High and low are the day's auction range. Medians are of the traded average. Gaps are days with no trades."
      >
        <EChart option={priceOption} height={300} />
      </DashboardPanel>
      <DashboardPanel
        title="Liquidity"
        help="Solid lines are 7- and 30-day medians of ISK volume, on the left axis. Dashed lines are the same medians of order count, on the right axis. Days with no trades count as zero."
      >
        <EChart option={liquidityOption} height={300} />
      </DashboardPanel>
      <DashboardPanel
        title="Intraday range"
        help="High-to-low as a percent of the high. Medians skip days with no trades."
      >
        <EChart option={rangeOption} height={300} />
      </DashboardPanel>
    </>
  );
}

function DashboardPanel(props: { title: string; help: string; children: ReactNode }) {
  return (
    <Box sx={{
      border: 1,
      borderColor: 'divider',
      borderRadius: 1,
      p: 1,
      minWidth: 0,
    }}>
      <Tooltip title={props.help}>
        <Typography variant="subtitle2" sx={{ cursor: 'help', width: 'fit-content', mb: 0.5 }}>
          {props.title}
        </Typography>
      </Tooltip>
      {props.children}
    </Box>
  );
}

function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
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
