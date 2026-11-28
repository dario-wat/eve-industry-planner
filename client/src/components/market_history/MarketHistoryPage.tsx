import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRecoilState } from 'recoil';
import { Box, MenuItem, Tab, Tabs, TextField, Tooltip, Typography, useTheme } from '@mui/material';
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
  HISTORY_CHART_GROUP,
  priceChartOption,
  rangeChartOption,
  volumeChartOption,
} from './historyChartOptions';
import { MarketHistoryDay, buildMarketHistoryDays } from './marketHistoryStats';
import MarketHistorySummaryTable, { HistoryHeadline } from './MarketHistorySummaryTable';
import TradeCalculator from './TradeCalculator';
import OrderBookPanel from './OrderBookPanel';
import YourPositionPanel from './YourPositionPanel';
import { PanelLoading } from './tradeVisuals';
import { ItemTab, itemPageAtom } from './itemPageStore';
import WorkspacePage from 'components/util/WorkspacePage';

export default function MarketHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramTypeId = typeIdFromSearch(searchParams.get('typeId'));
  const tab: ItemTab = searchParams.get('tab') === 'history' ? 'history' : 'trade';
  const [stored, setStored] = useRecoilState(itemPageAtom);
  const [typeId, setTypeId] = useState<number | null>(paramTypeId ?? stored.typeId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const historyData = stored.history !== null && stored.history.typeId === paramTypeId
    ? stored.history.data
    : null;
  const span = stored.span;
  const setSpan = (next: ChartSpan) => setStored(current => ({ ...current, span: next }));
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
      setStored(state => ({ ...state, history: { typeId: id, data } }));
    } catch {
      if (current !== requestId.current) {
        return;
      }
      setStored(state => ({ ...state, history: null }));
      setError('Could not load item history.');
    } finally {
      if (current === requestId.current) {
        setIsLoading(false);
      }
    }
  }, [setStored]);

  useEffect(() => {
    if (paramTypeId === null && stored.typeId !== null) {
      setSearchParams({ typeId: String(stored.typeId), tab: stored.tab }, { replace: true });
    }
  }, [paramTypeId, stored.typeId, stored.tab, setSearchParams]);

  useEffect(() => {
    if (paramTypeId !== null) {
      setStored(state => (state.tab === tab ? state : { ...state, tab }));
    }
  }, [paramTypeId, tab, setStored]);

  const cachedHistoryTypeId = stored.history?.typeId ?? null;
  useEffect(() => {
    if (paramTypeId == null) {
      return;
    }
    setTypeId(paramTypeId);
    setStored(state => (state.typeId === paramTypeId ? state : { ...state, typeId: paramTypeId }));
    if (cachedHistoryTypeId !== paramTypeId) {
      void loadHistory(paramTypeId);
    }
    // Only a new item loads history; the cache check must not retrigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramTypeId, loadHistory, setStored]);

  const onSubmit = () => {
    if (typeId === null) {
      return;
    }
    if (typeId === paramTypeId) {
      void loadHistory(typeId);
      return;
    }
    setSearchParams({ typeId: String(typeId), tab });
  };

  const onTabChange = (next: ItemTab) => {
    setSearchParams(paramTypeId === null
      ? { tab: next }
      : { typeId: String(paramTypeId), tab: next });
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
      </Box>
      {error && (
        <Typography color="error" sx={{ pt: 2 }}>
          {error}
        </Typography>
      )}
      <Tabs
        sx={{ mt: 1, borderBottom: 1, borderColor: 'divider' }}
        value={tab}
        onChange={(_, value: ItemTab) => onTabChange(value)}
      >
        <Tab label="Trade" value="trade" />
        <Tab label="History" value="history" />
      </Tabs>
      {tab === 'trade' && paramTypeId != null && (
        <Box sx={{ pt: 2 }}>
          <DashboardPanel
            title="Trade calculator"
            help="A buy order at the buy station and a sell order at the sell station set in Settings. Each price is the best order yours would compete with. Buy orders placed elsewhere count if their range reaches the buy station. Fees are the character's, from live skills and standings."
          >
            <TradeCalculator key={paramTypeId} typeId={paramTypeId} />
          </DashboardPanel>
          <Box sx={{ pt: 1.5 }}>
            <DashboardPanel
              title="Order book"
              help="Live orders from the stored book at the stations set in Settings. The buy side lists every buy order a seller at the buy station can fill, including ranged orders placed in Jita. The chart covers prices within 25% of the best; the table lists every order."
            >
              <OrderBookPanel key={paramTypeId} typeId={paramTypeId} />
            </DashboardPanel>
          </Box>
          <Box sx={{ pt: 1.5 }}>
            <DashboardPanel
              title="Your position"
              help="Open orders and stored wallet transactions of the characters picked in the character selector. Spread is average sell minus average buy over the last 30 days, before fees. Hover a fill's time for the character and station."
            >
              <YourPositionPanel key={paramTypeId} typeId={paramTypeId} />
            </DashboardPanel>
          </Box>
        </Box>
      )}
      {tab === 'history' && (
        <>
          <Box sx={{ pt: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
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
          {isLoading && <PanelLoading />}
          {!isLoading && marketHistoryDays.length > 0 && (
            <HistoryDashboard days={marketHistoryDays} span={span} />
          )}
          {!isLoading && historyData != null && marketHistoryDays.length === 0 && (
            <Typography sx={{ pt: 2 }}>No item history for this type.</Typography>
          )}
        </>
      )}
    </WorkspacePage>
  );
}

function HistoryDashboard(props: { days: MarketHistoryDay[]; span: ChartSpan }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const colors = useMemo<ChartColors>(() => {
    // MUI's dark primary is nearly white on charts; these pairs are checked against each surface.
    const accent = isDark ? '#4a9fe8' : '#1565c0';
    return {
      accent,
      bars: withAlpha(theme.palette.grey[isDark ? 500 : 400], isDark ? 0.55 : 0.7),
      band: withAlpha(accent, isDark ? 0.28 : 0.18),
      reference: isDark ? '#d6609c' : '#c2185b',
      text: theme.palette.text.primary,
      muted: theme.palette.text.secondary,
      divider: theme.palette.divider,
      paper: theme.palette.background.paper,
      fontFamily: theme.typography.fontFamily ?? 'sans-serif',
    };
  }, [isDark, theme]);
  const priceOption = useMemo(
    () => priceChartOption(props.days, props.span, colors),
    [props.days, props.span, colors],
  );
  const volumeOption = useMemo(
    () => volumeChartOption(props.days, props.span, colors),
    [props.days, props.span, colors],
  );
  const rangeOption = useMemo(
    () => rangeChartOption(props.days, props.span, colors),
    [props.days, props.span, colors],
  );

  return (
    <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <HistoryHeadline days={props.days} />
      <DashboardPanel
        title="Price"
        help="The band is each day's high to low. The line is the day's traded average; the magenta line is its 30-day median. The dashed 7-day median is off by default; click it in the legend. Gaps are days with no trades."
      >
        <EChart option={priceOption} height={360} group={HISTORY_CHART_GROUP} />
      </DashboardPanel>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
        <DashboardPanel
          title="Volume"
          help="Bars are ISK traded each day; missing bars are days with no trades. Lines are 7- and 30-day medians. Hover for units and order count."
        >
          <EChart option={volumeOption} height={240} group={HISTORY_CHART_GROUP} />
        </DashboardPanel>
        <DashboardPanel
          title="Intraday range"
          help="Bars are each day's high-to-low as a percent of the high. Lines are 7- and 30-day medians. Days with no trades are skipped."
        >
          <EChart option={rangeOption} height={240} group={HISTORY_CHART_GROUP} />
        </DashboardPanel>
      </Box>
      <Box sx={{ width: { xs: '100%', md: 'fit-content' } }}>
        <DashboardPanel
          title="Summary"
          help="Windows are calendar days ending on the latest trade date. The 30-day column matches the numbers at the top."
        >
          <MarketHistorySummaryTable days={props.days} />
        </DashboardPanel>
      </Box>
    </Box>
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
