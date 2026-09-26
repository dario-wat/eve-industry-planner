import { ReactNode, useMemo, useState } from 'react';
import { Box, Card, CardContent, MenuItem, TextField, Tooltip, Typography, useTheme } from '@mui/material';
import HelpIcon from '@mui/icons-material/Help';
import { LoadingButton } from '@mui/lab';
import axios from 'axios';
import { MarketHistoryRes } from '@internal/shared';
import { format } from 'date-fns';
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
import { MarketHistoryDay, buildMarketHistoryDays } from './marketHistoryStats';
import MarketHistorySummaryTable from './MarketHistorySummaryTable';

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
                <MarketHistorySummaryTable days={marketHistoryDays} />
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
