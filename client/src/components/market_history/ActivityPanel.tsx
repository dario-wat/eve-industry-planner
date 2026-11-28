import useAxios from 'axios-hooks';
import { ReactNode, useMemo } from 'react';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Theme, useTheme } from '@mui/material/styles';
import type { EChartsCoreOption } from 'echarts/core';
import { format, formatDistanceToNowStrict } from 'date-fns';
import {
  ActivitySideCounts,
  BookSide,
  MarketOrdersRes,
  TradeActivityDayRes,
  TradeActivityRes,
  TradeActivityStationRes,
} from '@internal/shared';
import { formatNumber, formatNumberScale } from 'common/format';
import EChart from 'components/util/EChart';
import { PanelLoading, sideColor, SideChip } from './tradeVisuals';

/** Competitor activity for one item, from the order book poll. */
export default function ActivityPanel({ typeId }: { typeId: number }) {
  const [{ data, error }] = useAxios<TradeActivityRes | null>(`/trade_activity/${typeId}`);
  const [{ data: myOrders }] = useAxios<MarketOrdersRes | null>(`/market_orders?typeId=${typeId}`);
  const myOrderIds = useMemo(
    () => new Set((myOrders ?? []).map(order => order.orderId)),
    [myOrders],
  );

  if (error) {
    return <Typography color="error" variant="body2">Could not load activity.</Typography>;
  }
  if (data === undefined) {
    return <PanelLoading />;
  }
  if (data === null) {
    return null;
  }

  const sellStation = data.sellLocationName ?? 'the sell station';
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
        gap: 1.5,
      }}
    >
      <SideCard
        side="buy"
        title="Buy orders"
        subtitle="Jita and Perimeter"
        stations={data.last24h.filter(s => s.isBuy)}
        unitsLabel="Units sold into them"
        days={data.days}
      />
      <SideCard
        side="sell"
        title="Sell orders"
        subtitle={sellStation}
        stations={data.last24h.filter(s => !s.isBuy && s.locationId === data.sellLocationId)}
        unitsLabel="Units bought from them"
        days={data.days}
      />
      <Card title="Last 24 hours by station">
        <StationsTable stations={data.last24h} />
      </Card>
      <Card
        title="Latest moves"
        help="The newest reprices and new orders. A highlighted row is one of your open orders."
      >
        <RecentTable data={data} myOrderIds={myOrderIds} />
      </Card>
    </Box>
  );
}

function Card(props: { title: string; help?: string; children: ReactNode }) {
  const title = (
    <Typography
      variant="subtitle2"
      sx={{ width: 'fit-content', cursor: props.help ? 'help' : undefined }}
    >
      {props.title}
    </Typography>
  );
  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        px: 1.5,
        py: 1,
        minWidth: 0,
        overflowX: 'auto',
      }}
    >
      <Box sx={{ mb: 0.75 }}>
        {props.help ? <Tooltip title={props.help}>{title}</Tooltip> : title}
      </Box>
      {props.children}
    </Box>
  );
}

function SideCard(props: {
  side: BookSide;
  title: string;
  subtitle: string;
  stations: TradeActivityStationRes[];
  unitsLabel: string;
  days: TradeActivityDayRes[];
}) {
  const theme = useTheme();
  const color = sideColor(theme, props.side);
  const repriced = props.stations.reduce((total, s) => total + s.repriced, 0);
  const orders = props.stations.reduce((total, s) => total + s.repricingOrders, 0);
  const appeared = props.stations.reduce((total, s) => total + s.appeared, 0);
  const units = props.stations.reduce((total, s) => total + s.unitsTraded, 0);
  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderTop: 3,
        borderTopColor: color,
        borderRadius: 1,
        bgcolor: 'background.paper',
        px: 1.5,
        py: 1,
        minWidth: 0,
      }}
    >
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.75 }}>
        <SideChip side={props.side} />
        <Typography variant="subtitle2">{props.title}</Typography>
        <Typography variant="caption" color="text.secondary">{props.subtitle}</Typography>
      </Box>
      <SectionLabel>Last 24 hours</SectionLabel>
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Stat
          label="Reprices"
          help="Price changes, and how many different orders made them"
          value={formatNumber(repriced)}
          detail={orders > 0 ? `by ${formatNumber(orders)} order${orders === 1 ? '' : 's'}` : undefined}
          color={color}
        />
        <Stat label="New orders" value={formatNumber(appeared)} />
        <Stat label={props.unitsLabel} value={formatNumberScale(units)} />
      </Box>
      <SectionLabel top>Per day</SectionLabel>
      <DailyChart days={props.days} side={props.side} />
    </Box>
  );
}

function SectionLabel({ top, children }: { top?: boolean; children: ReactNode }) {
  return (
    <Typography
      variant="overline"
      color="text.secondary"
      component="div"
      sx={{ lineHeight: 1.5, mt: top ? 1.5 : 0 }}
    >
      {children}
    </Typography>
  );
}

function Stat(props: { label: string; value: string; detail?: string; help?: string; color?: string }) {
  const label = (
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
      {props.label}
    </Typography>
  );
  return (
    <Box>
      {props.help
        ? <Tooltip title={props.help}><Box sx={{ cursor: 'help' }}>{label}</Box></Tooltip>
        : label}
      <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', lineHeight: 1.2, color: props.color }}>
        {props.value}
      </Typography>
      {props.detail && (
        <Typography variant="caption" color="text.secondary">{props.detail}</Typography>
      )}
    </Box>
  );
}

function DailyChart(props: { days: TradeActivityDayRes[]; side: BookSide }) {
  const theme = useTheme();
  const { days, side } = props;
  const option = useMemo(() => dailyOption(theme, days, side), [theme, days, side]);
  return <EChart option={option} height={220} />;
}

function dailyOption(theme: Theme, days: TradeActivityDayRes[], side: BookSide): EChartsCoreOption {
  const muted = theme.palette.text.secondary;
  const divider = theme.palette.divider;
  const isDark = theme.palette.mode === 'dark';
  const repricesColor = isDark ? '#9b7be6' : '#5e35b1';
  const newOrdersColor = isDark ? '#c4951c' : '#b07d00';
  const series = (name: string, color: string, pick: (counts: ActivitySideCounts) => number) => ({
    name,
    type: 'bar',
    data: days.map(day => pick(day[side])),
    itemStyle: { color, borderRadius: [2, 2, 0, 0] },
    barGap: '10%',
    emphasis: { disabled: true },
  });
  return {
    animation: false,
    grid: { left: 40, right: 8, top: 28, bottom: 22 },
    legend: {
      top: 0,
      itemWidth: 14,
      itemHeight: 8,
      textStyle: { color: theme.palette.text.primary, fontSize: 11 },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: theme.palette.background.paper,
      borderColor: divider,
      textStyle: { color: theme.palette.text.primary, fontSize: 12 },
    },
    xAxis: {
      type: 'category',
      data: days.map(day => format(new Date(`${day.date}T00:00:00Z`), 'd MMM')),
      axisLabel: { color: muted, fontSize: 11, hideOverlap: true },
      axisLine: { lineStyle: { color: divider } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: muted, fontSize: 11 },
      splitLine: { lineStyle: { color: divider, opacity: 0.6 } },
    },
    series: [
      series('Reprices', repricesColor, counts => counts.repriced),
      series('New orders', newOrdersColor, counts => counts.appeared),
    ],
  };
}

function StationsTable({ stations }: { stations: TradeActivityStationRes[] }) {
  if (stations.length === 0) {
    return <Typography variant="body2" color="text.secondary">No activity in the last 24 hours.</Typography>;
  }
  return (
    <CompactTable head={['', 'Station', 'Reprices', 'By orders', 'New', 'Units traded']} rightAligned={[2, 3, 4, 5]}>
      {stations.map(station => (
        <TableRow key={`${station.locationId}:${station.isBuy}`}>
          <TableCell><SideChip side={station.isBuy ? 'buy' : 'sell'} /></TableCell>
          <TableCell>{station.locationName ?? `Location ${station.locationId}`}</TableCell>
          <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatNumber(station.repriced)}</TableCell>
          <TableCell align="right">{formatNumber(station.repricingOrders)}</TableCell>
          <TableCell align="right">{formatNumber(station.appeared)}</TableCell>
          <TableCell align="right">{formatNumberScale(station.unitsTraded)}</TableCell>
        </TableRow>
      ))}
    </CompactTable>
  );
}

function RecentTable(props: { data: TradeActivityRes; myOrderIds: ReadonlySet<number> }) {
  const theme = useTheme();
  if (props.data.recent.length === 0) {
    return <Typography variant="body2" color="text.secondary">No reprices or new orders yet.</Typography>;
  }
  return (
    <Box sx={{ maxHeight: 360, overflow: 'auto' }}>
      <CompactTable head={['When', '', 'Station', 'Price', 'Change', '']} rightAligned={[3, 4]} sticky>
        {props.data.recent.map((event, index) => {
          const side: BookSide = event.isBuy ? 'buy' : 'sell';
          const change = event.previousPrice === null ? null : event.price - event.previousPrice;
          const mine = props.myOrderIds.has(event.orderId);
          return (
            <TableRow key={index} sx={mine ? { bgcolor: 'action.selected' } : undefined}>
              <TableCell sx={{ color: 'text.secondary' }}>
                <Tooltip title={format(new Date(event.observedAt), 'd MMM HH:mm')}>
                  <span>{formatDistanceToNowStrict(new Date(event.observedAt), { addSuffix: true })}</span>
                </Tooltip>
              </TableCell>
              <TableCell><SideChip side={side} /></TableCell>
              <TableCell>{event.locationName ?? '—'}</TableCell>
              <TableCell align="right" sx={{ color: sideColor(theme, side), fontWeight: 'bold' }}>
                {formatNumber(event.price, 2)}
              </TableCell>
              <TableCell align="right" sx={{ color: 'text.secondary' }}>
                {change === null ? 'New order' : `${change > 0 ? '+' : ''}${formatNumber(change, 2)}`}
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{mine ? 'You' : ''}</TableCell>
            </TableRow>
          );
        })}
      </CompactTable>
    </Box>
  );
}

function CompactTable(props: {
  head: string[];
  rightAligned: number[];
  sticky?: boolean;
  children: ReactNode;
}) {
  return (
    <Table size="small" stickyHeader={props.sticky} sx={{ width: 'auto', whiteSpace: 'nowrap' }}>
      <TableHead>
        <TableRow>
          {props.head.map((label, index) => (
            <TableCell key={index} align={props.rightAligned.includes(index) ? 'right' : 'left'}>
              {label}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>{props.children}</TableBody>
    </Table>
  );
}
