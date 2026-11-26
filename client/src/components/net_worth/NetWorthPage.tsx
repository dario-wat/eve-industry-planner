import useAxios from 'axios-hooks';
import { useMemo, useState } from 'react';
import type { EChartsCoreOption } from 'echarts/core';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Theme, useTheme } from '@mui/material/styles';
import { NetWorthHistoryRes } from '@internal/shared';
import { formatIsk, formatNumber } from 'common/format';
import EChart from 'components/util/EChart';
import WorkspacePage, { WorkspaceSection, WorkspaceSpinner } from 'components/util/WorkspacePage';

type Parts = { wallet: number; buyOrders: number; sellOrders: number; assets: number };

const ALL = 'all';

const SERIES: { key: keyof Parts; name: string; light: string; dark: string }[] = [
  { key: 'wallet', name: 'Wallet', light: '#257de0', dark: '#338ced' },
  { key: 'buyOrders', name: 'Buy orders', light: '#f47230', dark: '#e76624' },
  { key: 'sellOrders', name: 'Sell orders', light: '#00b894', dark: '#00a888' },
  { key: 'assets', name: 'Assets', light: '#f2a600', dark: '#d28e05' },
];

export default function NetWorthPage() {
  const theme = useTheme();
  const [{ data, error }] = useAxios<NetWorthHistoryRes | null>('/net_worth_history');
  const [character, setCharacter] = useState<string>(ALL);

  const days = useMemo(
    () => (data == null ? [] : sumByDay(data, character)),
    [data, character],
  );
  const option = useMemo(() => chartOption(theme, days), [theme, days]);

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
        <TextField
          select
          size="small"
          label="Character"
          value={character}
          onChange={e => setCharacter(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value={ALL}>All characters</MenuItem>
          {data.characters.map(c => (
            <MenuItem key={c.characterId} value={String(c.characterId)}>{c.characterName}</MenuItem>
          ))}
        </TextField>
        {last !== undefined &&
          <Typography variant="body2">
            <b>{formatIsk(total(last))}</b> on {last.day}
            {first !== last && ` (${signedIsk(total(last) - total(first))} since ${first.day})`}
          </Typography>
        }
        <Typography variant="caption" color="text.secondary">
          Assets are valued at the best Jita 4-4 buy order.
        </Typography>
      </Box>
      <WorkspaceSection title="Net worth">
        {days.length === 0
          ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
              No snapshots yet. The net worth job stores one per character every day at 15:00 UTC.
            </Typography>
          )
          : <Box sx={{ p: 1, flex: 1, display: 'flex', minHeight: 0 }}><EChart option={option} height="100%" /></Box>
        }
      </WorkspaceSection>
    </WorkspacePage>
  );
}

type Day = Parts & { day: string };

function sumByDay(data: NetWorthHistoryRes, character: string): Day[] {
  const byDay = new Map<string, Day>();
  for (const row of data.days) {
    if (character !== ALL && String(row.characterId) !== character) {
      continue;
    }
    const day = byDay.get(row.day) ?? { day: row.day, wallet: 0, buyOrders: 0, sellOrders: 0, assets: 0 };
    day.wallet += row.wallet;
    day.buyOrders += row.buyOrders;
    day.sellOrders += row.sellOrders;
    day.assets += row.assetsBuy;
    byDay.set(row.day, day);
  }
  return Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));
}

function total(day: Parts): number {
  return day.wallet + day.buyOrders + day.sellOrders + day.assets;
}

function signedIsk(value: number): string {
  return `${value >= 0 ? '+' : '−'}${formatIsk(Math.abs(value))}`;
}

function chartOption(theme: Theme, days: Day[]): EChartsCoreOption {
  const text = theme.palette.text.primary;
  const muted = theme.palette.text.secondary;
  const divider = theme.palette.divider;
  const surface = theme.palette.background.paper;
  const dark = theme.palette.mode === 'dark';
  return {
    animation: false,
    textStyle: { fontFamily: theme.typography.fontFamily ?? 'sans-serif', color: muted },
    grid: { left: 72, right: 16, top: 36, bottom: 28 },
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
      boundaryGap: false,
      data: days.map(d => d.day),
      axisLabel: { hideOverlap: true, color: muted },
      axisLine: { lineStyle: { color: divider } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLabel: { color: muted, formatter: (value: number) => formatIsk(value) },
      splitLine: { lineStyle: { color: divider } },
    },
    series: SERIES.map(s => ({
      type: 'line' as const,
      name: s.name,
      stack: 'total',
      data: days.map(d => d[s.key]),
      symbol: 'circle',
      symbolSize: 8,
      showSymbol: days.length === 1,
      lineStyle: { width: 2, color: dark ? s.dark : s.light },
      itemStyle: { color: dark ? s.dark : s.light, borderColor: surface, borderWidth: 2 },
      areaStyle: { color: dark ? s.dark : s.light, opacity: 0.35 },
      emphasis: { focus: 'none' },
    })),
  };
}

function tooltip(params: unknown, days: Day[]): string {
  const items = (Array.isArray(params) ? params : [params]) as {
    seriesName?: string;
    marker?: string;
    value?: number;
    dataIndex?: number;
  }[];
  const day = days[items[0]?.dataIndex ?? -1];
  if (day === undefined) {
    return '';
  }
  const rows = items.map(item =>
    `${item.marker ?? ''}${item.seriesName}: ${formatIsk(item.value ?? 0)}`);
  return [
    day.day,
    ...rows.reverse(),
    `<b>Total: ${formatIsk(total(day))}</b> (${formatNumber(total(day), 0)} ISK)`,
  ].join('<br/>');
}
