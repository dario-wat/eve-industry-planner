import useAxios from 'axios-hooks';
import { useMemo } from 'react';
import type { EChartsCoreOption } from 'echarts/core';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Theme, useTheme } from '@mui/material/styles';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { NetWorthHistoryRes } from '@internal/shared';
import { formatIsk, formatNumber, formatPercentPoints } from 'common/format';
import EChart from 'components/util/EChart';
import WorkspacePage, { WorkspaceSection, WorkspaceSpinner } from 'components/util/WorkspacePage';

type Day = {
  day: string;
  netWorth: number;
  /** Change minus In/Out. */
  gain: number;
  inOut: number;
  change: number;
  /** Percent of the previous day's net worth. */
  gainPct: number;
  gainPct7d: number | null;
  gainPct28d: number | null;
  gain7d: number | null;
};

export default function NetWorthPage() {
  const theme = useTheme();
  const [{ data, error }] = useAxios<NetWorthHistoryRes | null>('/net_worth_history');

  const days = useMemo(() => (data == null ? [] : buildDays(data)), [data]);
  const option = useMemo(() => chartOption(theme, days), [theme, days]);
  const rows = useMemo(() => [...days].reverse(), [days]);

  if (error) {
    return <WorkspacePage><Typography color="error">Could not load net worth.</Typography></WorkspacePage>;
  }
  if (data === undefined) {
    return <WorkspacePage><WorkspaceSpinner /></WorkspacePage>;
  }
  if (data === null) {
    return null;
  }

  const first = days[0];
  const last = days[days.length - 1];

  return (
    <WorkspacePage>
      <Box sx={{ pb: 1, flexShrink: 0, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        {last !== undefined &&
          <Typography variant="body2">
            <b>{formatIsk(last.netWorth)}</b> on {last.day}
            {first !== last && ` (${signedIsk(last.netWorth - first.netWorth)} since ${first.day})`}
          </Typography>
        }
        <Typography variant="caption" color="text.secondary">
          Assets are valued at the best Jita 4-4 buy order. In/Out is ISK donated or taken from a
          corp wallet, to or from characters outside the selection.
        </Typography>
      </Box>
      {days.length === 0
        ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
            No snapshots yet. The net worth job stores one per character every day at 15:00 UTC.
          </Typography>
        )
        : (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <WorkspaceSection title="Net worth">
              <Box sx={{ p: 1, flex: 1, display: 'flex', minHeight: 0 }}>
                <EChart option={option} height="100%" />
              </Box>
            </WorkspaceSection>
            <WorkspaceSection title="Daily">
              <DataGrid
                rows={rows}
                columns={COLUMNS}
                getRowId={(row) => row.day}
                density="compact"
                disableRowSelectionOnClick
                disableColumnMenu
                hideFooter
              />
            </WorkspaceSection>
          </Box>
        )
      }
    </WorkspacePage>
  );
}

function buildDays(data: NetWorthHistoryRes): Day[] {
  const byDay = new Map<string, { netWorth: number; inOut: number }>();
  for (const row of data.days) {
    const day = byDay.get(row.day) ?? { netWorth: 0, inOut: 0 };
    day.netWorth += row.wallet + row.buyOrders + row.sellOrders + row.assetsBuy;
    day.inOut += row.inOut;
    byDay.set(row.day, day);
  }
  const sorted = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));

  const days: Day[] = [];
  sorted.forEach(([day, { netWorth, inOut }], i) => {
    const previous = days[i - 1];
    const change = previous === undefined ? 0 : netWorth - previous.netWorth;
    const flow = previous === undefined ? 0 : inOut;
    const gain = change - flow;
    days.push({
      day,
      netWorth,
      gain,
      inOut: flow,
      change,
      gainPct: previous === undefined || previous.netWorth === 0 ? 0 : gain / previous.netWorth * 100,
      gainPct7d: null,
      gainPct28d: null,
      gain7d: null,
    });
    const current = days[i];
    current.gainPct7d = trailingMean(days, 7, (d) => d.gainPct);
    current.gainPct28d = trailingMean(days, 28, (d) => d.gainPct);
    current.gain7d = trailingMean(days, 7, (d) => d.gain);
  });
  return days;
}

/** Over the last `window` snapshots, null until there are that many. */
function trailingMean(days: Day[], window: number, value: (day: Day) => number): number | null {
  if (days.length < window) {
    return null;
  }
  return days.slice(-window).reduce((sum, d) => sum + value(d), 0) / window;
}

function signedIsk(value: number): string {
  return `${value >= 0 ? '+' : '−'}${formatIsk(Math.abs(value))}`;
}

function SignedCell(props: { value: number | null; format: (value: number) => string }) {
  if (props.value === null) {
    return null;
  }
  const color = props.value > 0 ? 'success.main' : props.value < 0 ? 'error.main' : 'text.primary';
  return <Box component="span" sx={{ color }}>{props.format(props.value)}</Box>;
}

const percent = (value: number) => formatPercentPoints(value, 2);

function numberColumn(
  field: keyof Day,
  headerName: string,
  format: (value: number) => string,
  colored = false,
): GridColDef<Day> {
  return {
    field,
    headerName,
    type: 'number',
    width: 130,
    renderCell: (params: GridRenderCellParams<Day, number | null>) => {
      const value = params.value ?? null;
      if (colored) {
        return <SignedCell value={value} format={format} />;
      }
      return value === null ? '' : format(value);
    },
  };
}

const COLUMNS: GridColDef<Day>[] = [
  { field: 'day', headerName: 'Date', width: 110 },
  numberColumn('netWorth', 'Net worth', formatIsk),
  numberColumn('gain', 'Gain', formatIsk, true),
  numberColumn('inOut', 'In/Out', formatIsk, true),
  numberColumn('change', 'Change', formatIsk),
  numberColumn('gainPct', '% Gain', percent),
  numberColumn('gainPct7d', '7d % Gain Avg', percent),
  numberColumn('gainPct28d', '28d % Gain Avg', percent),
  numberColumn('gain7d', '7d Gain Avg', formatIsk),
];

function chartOption(theme: Theme, days: Day[]): EChartsCoreOption {
  const text = theme.palette.text.primary;
  const muted = theme.palette.text.secondary;
  const divider = theme.palette.divider;
  const surface = theme.palette.background.paper;
  const dark = theme.palette.mode === 'dark';
  const colors = {
    netWorth: dark ? '#338ced' : '#257de0',
    gainPct: dark ? '#e5484d' : '#d93036',
    gainPct7d: dark ? '#d28e05' : '#f2a600',
  };
  return {
    animation: false,
    textStyle: { fontFamily: theme.typography.fontFamily ?? 'sans-serif', color: muted },
    grid: { left: 72, right: 56, top: 36, bottom: 28 },
    legend: {
      top: 0,
      left: 'center',
      itemWidth: 14,
      itemHeight: 8,
      textStyle: { color: text, fontSize: 11 },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: muted } },
      backgroundColor: surface,
      borderColor: divider,
      textStyle: { color: text, fontSize: 12 },
      formatter: (params: unknown) => tooltip(params, days),
    },
    xAxis: {
      type: 'category',
      data: days.map(d => d.day),
      axisLabel: { hideOverlap: true, color: muted },
      axisLine: { lineStyle: { color: divider } },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        min: 0,
        axisLabel: { color: muted, formatter: (value: number) => formatIsk(value) },
        splitLine: { lineStyle: { color: divider } },
      },
      {
        type: 'value',
        axisLabel: { color: muted, formatter: (value: number) => `${formatNumber(value, 1)}%` },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        type: 'bar',
        name: 'Net worth',
        data: days.map(d => d.netWorth),
        itemStyle: { color: colors.netWorth },
        barMaxWidth: 24,
      },
      {
        type: 'line',
        name: '% Gain',
        yAxisIndex: 1,
        data: days.map(d => d.gainPct),
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: days.length === 1,
        lineStyle: { width: 2, color: colors.gainPct },
        itemStyle: { color: colors.gainPct },
      },
      {
        type: 'line',
        name: '7d % Gain Avg',
        yAxisIndex: 1,
        data: days.map(d => d.gainPct7d),
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        lineStyle: { width: 2, color: colors.gainPct7d },
        itemStyle: { color: colors.gainPct7d },
      },
    ],
  };
}

function tooltip(params: unknown, days: Day[]): string {
  const items = (Array.isArray(params) ? params : [params]) as { dataIndex?: number }[];
  const day = days[items[0]?.dataIndex ?? -1];
  if (day === undefined) {
    return '';
  }
  return [
    `<b>${day.day}</b>`,
    `Net worth: ${formatIsk(day.netWorth)} (${formatNumber(day.netWorth, 0)} ISK)`,
    `% Gain: ${percent(day.gainPct)}`,
    `7d % Gain Avg: ${day.gainPct7d === null ? '—' : percent(day.gainPct7d)}`,
  ].join('<br/>');
}
