import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, MenuItem, TextField, Tooltip, Typography, useTheme } from '@mui/material';
import HelpIcon from '@mui/icons-material/Help';
import { LoadingButton } from '@mui/lab';
import axios from 'axios';
import { MarketHistoryRes } from '@internal/shared';
import { format } from 'date-fns';
import ItemAutocomplete from 'components/util/ItemAutocomplete';
import EChart from 'components/util/EChart';
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
import WorkspacePage from 'components/util/WorkspacePage';

export default function MarketHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramTypeId = typeIdFromSearch(searchParams.get('typeId'));
  const [typeId, setTypeId] = useState<number | null>(paramTypeId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<MarketHistoryRes | null>(null);
  const [span, setSpan] = useState<ChartSpan>('90d');
  const requestId = useRef(0);
  const marketHistoryDays = useMemo(
    () => (historyData == null ? [] : buildMarketHistoryDays(historyData)),
    [historyData],
  );

  const loadHistory = useCallback(async (id: number) => {
    const current = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<MarketHistoryRes>(`/market_history/${id}`);
      if (current !== requestId.current) {
        return;
      }
      setHistoryData(data);
    } catch {
      if (current !== requestId.current) {
        return;
      }
      setHistoryData(null);
      setError('Could not load market history.');
    } finally {
      if (current === requestId.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (paramTypeId == null) {
      return;
    }
    setTypeId(paramTypeId);
    void loadHistory(paramTypeId);
  }, [paramTypeId, loadHistory]);

  const onSubmit = () => {
    if (typeId === null) {
      return;
    }
    if (typeId === paramTypeId) {
      void loadHistory(typeId);
      return;
    }
    setSearchParams({ typeId: String(typeId) });
  };

  return (
    <WorkspacePage scroll>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <ItemAutocomplete onSelect={setTypeId} typeId={typeId} width={350} variant="outlined" />
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
          label="Range"
          value={span}
          onChange={(event) => setSpan(event.target.value as ChartSpan)}
          sx={{ width: 140 }}
        >
          {CHART_SPANS.map((option) => (
            <MenuItem key={option.id} value={option.id}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        {marketHistoryDays.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1 }}>
              The Forge ·{' '}
              {format(marketHistoryDays[marketHistoryDays.length - 1].time, 'd MMM yyyy')}
            </Typography>
            <Tooltip title="Days with no trades are gaps in the price line and zero volume.">
              <Box component="span" sx={{ display: 'inline-flex' }}>
                <HelpIcon
                  sx={{ fontSize: 16, color: 'text.secondary', position: 'relative', top: -1 }}
                />
              </Box>
            </Tooltip>
          </Box>
        )}
      </Box>
      {error && (
        <Typography color="error" sx={{ pt: 2 }}>
          {error}
        </Typography>
      )}
      {marketHistoryDays.length > 0 && (
        <Box
          sx={{
            pt: 2,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 1.5,
          }}
        >
          <DashboardPanel
            title="Summary"
            help="Windows are calendar days ending on the latest trade date."
          >
            <MarketHistorySummaryTable days={marketHistoryDays} />
          </DashboardPanel>
          <HistoryCharts days={marketHistoryDays} span={span} />
        </Box>
      )}
      {historyData != null && marketHistoryDays.length === 0 && (
        <Typography sx={{ pt: 2 }}>No market history for this type.</Typography>
      )}
    </WorkspacePage>
  );
}

function HistoryCharts(props: { days: MarketHistoryDay[]; span: ChartSpan }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const colors = useMemo<ChartColors>(
    () => ({
      band: withAlpha(theme.palette.grey[isDark ? 400 : 500], isDark ? 0.35 : 0.28),
      edge: theme.palette.grey[isDark ? 400 : 600],
      average: isDark ? theme.palette.primary.light : theme.palette.primary.main,
      median7: isDark ? theme.palette.warning.light : theme.palette.warning.dark,
      median30: isDark ? theme.palette.secondary.light : theme.palette.secondary.main,
      orders7: isDark ? theme.palette.primary.light : theme.palette.primary.main,
      orders30: isDark ? theme.palette.success.light : theme.palette.success.main,
      text: theme.palette.text.primary,
      muted: theme.palette.text.secondary,
      divider: theme.palette.divider,
      paper: theme.palette.background.paper,
      fontFamily: theme.typography.fontFamily ?? 'sans-serif',
    }),
    [isDark, theme],
  );
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
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        p: 1,
        minWidth: 0,
      }}
    >
      <Tooltip title={props.help}>
        <Typography variant="subtitle2" sx={{ cursor: 'help', width: 'fit-content', mb: 0.5 }}>
          {props.title}
        </Typography>
      </Tooltip>
      {props.children}
    </Box>
  );
}

function typeIdFromSearch(value: string | null): number | null {
  if (value == null || !/^\d+$/.test(value)) {
    return null;
  }
  const typeId = Number(value);
  return typeId > 0 ? typeId : null;
}

function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
