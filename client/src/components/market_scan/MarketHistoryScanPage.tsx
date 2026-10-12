import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import useAxios from 'axios-hooks';
import {
  Box,
  MenuItem,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { MarketHistoryScanRes } from '@internal/shared';
import { formatNumber } from 'common/format';
import WorkspacePage, { WorkspaceSpinner } from 'components/util/WorkspacePage';
import ScanChartTab from './ScanChartTab';
import ScanItemsTab from './ScanItemsTab';
import ScanWeekTab from './ScanWeekTab';
import {
  SCAN_WINDOWS,
  ScanWindowDays,
  categoryNames,
  filterScanRows,
  parseIskMillions,
  parsePercent,
  rowsForWindow,
} from './marketHistoryScan';

enum ScanTab {
  ITEMS = 'ITEMS',
  WEEK = 'WEEK',
  CHART = 'CHART',
}

const DEFAULT_WINDOW_DAYS: ScanWindowDays = 30;
const DEFAULT_CATEGORY_NAME = 'All';
const DEFAULT_MIN_DAYS_TEXT = '70';
const DEFAULT_MIN_ISK_TEXT = '1000';

export default function MarketHistoryScanPage() {
  const navigate = useNavigate();
  const [{ data, loading, error }] = useAxios<MarketHistoryScanRes>('/market_history/scan');
  const [windowDays, setWindowDays] = useState<ScanWindowDays>(DEFAULT_WINDOW_DAYS);
  const [categoryName, setCategoryName] = useState(DEFAULT_CATEGORY_NAME);
  const [minDaysText, setMinDaysText] = useState(DEFAULT_MIN_DAYS_TEXT);
  const [minIskText, setMinIskText] = useState(DEFAULT_MIN_ISK_TEXT);
  const [minRangeText, setMinRangeText] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState(ScanTab.ITEMS);

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
  const openType = (typeId: number) => {
    navigate(`/market_history?typeId=${typeId}`);
  };

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
          label="Search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ width: 180 }}
        />
        <TextField
          select
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
          label="Days traded %"
          value={minDaysText}
          onChange={(event) => setMinDaysText(event.target.value)}
          sx={{ width: 130 }}
        />
        <TextField
          label="Min M ISK/day"
          value={minIskText}
          onChange={(event) => setMinIskText(event.target.value)}
          sx={{ width: 160 }}
        />
        <TextField
          label="Min range %"
          value={minRangeText}
          onChange={(event) => setMinRangeText(event.target.value)}
          sx={{ width: 120 }}
        />
        <ToggleButtonGroup
          exclusive
          color="primary"
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
      <Tabs
        sx={{ flexShrink: 0, borderBottom: 1, borderColor: 'divider' }}
        value={tab}
        onChange={(_, value: ScanTab) => setTab(value)}
      >
        <Tab label="Items" value={ScanTab.ITEMS} />
        <Tab label="This week" value={ScanTab.WEEK} />
        <Tab label="Chart" value={ScanTab.CHART} />
      </Tabs>
      {tab === ScanTab.ITEMS && (
        <ScanItemsTab rows={visible} onOpen={openType} />
      )}
      {tab === ScanTab.WEEK && (
        <ScanWeekTab data={data} rows={visible} onOpen={openType} />
      )}
      {tab === ScanTab.CHART && (
        <ScanChartTab rows={visible} onOpen={openType} />
      )}
    </WorkspacePage>
  );
}

function formatDay(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (year == null || month == null || day == null || Number.isNaN(year)) {
    return iso;
  }
  return format(new Date(year, month - 1, day), 'd MMM yyyy');
}
