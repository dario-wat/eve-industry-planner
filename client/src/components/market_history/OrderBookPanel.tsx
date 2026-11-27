import useAxios from 'axios-hooks';
import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { Theme, useTheme } from '@mui/material/styles';
import type { EChartsCoreOption } from 'echarts/core';
import {
  BookSide,
  competingOrders,
  TradeBookOrderRes,
  TradeBookRes,
  TradeFeeRatesRes,
  TradeLocationRes,
} from '@internal/shared';
import { formatIsk, formatNumber } from 'common/format';
import EChart from 'components/util/EChart';

/** The chart covers prices within this share of the best one; the table lists every order. */
const CHART_PRICE_SPAN = 0.25;

const SYSTEM_NAMES: Record<number, string> = {
  30000142: 'Jita',
  30000144: 'Perimeter',
};

type BookRow = TradeBookOrderRes & { total: number };

/**
 * What a new buy order at the buy station and a new sell order at the sell station compete with.
 */
export default function OrderBookPanel({ typeId }: { typeId: number }) {
  const [{ data: feeData }] = useAxios<TradeFeeRatesRes | null>('/trade_fee_rates');
  const [{ data: book, error }] = useAxios<TradeBookRes | null>(`/trade_book/${typeId}`);

  if (error) {
    return <Typography color="error" variant="body2">Could not load the order book.</Typography>;
  }
  if (feeData == null || book == null) {
    return <Typography variant="body2">Loading order book…</Typography>;
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: 2,
      }}
    >
      <BookSideView
        title="Buy orders a seller here can fill"
        location={feeData.buyLocation}
        side="buy"
        orders={book.orders}
      />
      <BookSideView
        title="Sell orders here"
        location={feeData.sellLocation}
        side="sell"
        orders={book.orders}
      />
    </Box>
  );
}

function BookSideView(props: {
  title: string;
  location: TradeLocationRes;
  side: BookSide;
  orders: TradeBookOrderRes[];
}) {
  const theme = useTheme();
  const rows = useMemo(() => {
    let total = 0;
    return competingOrders(props.orders, props.location, props.side).map((order) => {
      total += order.volumeRemain;
      return { ...order, total };
    });
  }, [props.orders, props.location, props.side]);
  const option = useMemo(() => depthOption(theme, rows, props.side), [theme, rows, props.side]);
  const isBuy = props.side === 'buy';

  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="subtitle2">{props.title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {props.location.name ?? `Location ${props.location.locationId}`}
        {' · '}
        {formatNumber(rows.length)} orders, {formatNumber(rows[rows.length - 1]?.total ?? 0)} units
      </Typography>
      {rows.length === 0
        ? <Typography variant="body2" color="text.secondary">No orders.</Typography>
        : (
          <>
            <EChart option={option} height={160} />
            <Box sx={{ maxHeight: 320, overflow: 'auto', mt: 1 }}>
              <Table size="small" stickyHeader sx={{ whiteSpace: 'nowrap' }}>
                <TableHead>
                  <TableRow>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Volume</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Placed in</TableCell>
                    {isBuy && <TableCell>Range</TableCell>}
                    {isBuy && <TableCell align="right">Min volume</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.orderId}>
                      <TableCell align="right">{formatNumber(row.price, 2)}</TableCell>
                      <TableCell align="right">{formatNumber(row.volumeRemain)}</TableCell>
                      <TableCell align="right">{formatNumber(row.total)}</TableCell>
                      <TableCell>{placedIn(row, props.location)}</TableCell>
                      {isBuy && <TableCell>{rangeText(row.range)}</TableCell>}
                      {isBuy &&
                        <TableCell align="right">
                          {row.minVolume > 1 ? formatNumber(row.minVolume) : ''}
                        </TableCell>
                      }
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </>
        )
      }
    </Box>
  );
}

function placedIn(order: TradeBookOrderRes, location: TradeLocationRes): string {
  if (order.locationId === location.locationId) {
    return 'This station';
  }
  const system = SYSTEM_NAMES[order.systemId] ?? `System ${order.systemId}`;
  return order.systemId === location.systemId ? `${system}, other station` : system;
}

function rangeText(range: string): string {
  switch (range) {
    case 'station':
      return 'Station';
    case 'solarsystem':
      return 'System';
    case 'region':
      return 'Region';
    default:
      return range === '1' ? '1 jump' : `${range} jumps`;
  }
}

/** Units on offer at each price or better, for prices near the best one. */
function depthOption(theme: Theme, rows: BookRow[], side: BookSide): EChartsCoreOption {
  const best = rows[0]?.price ?? 0;
  const near = rows.filter((row) => Math.abs(row.price - best) <= best * CHART_PRICE_SPAN);
  const points = near.map((row) => [row.price, row.total]);
  if (side === 'buy') {
    points.reverse();
  }
  const dark = theme.palette.mode === 'dark';
  const line = dark ? theme.palette.primary.light : theme.palette.primary.main;
  const muted = theme.palette.text.secondary;
  const divider = theme.palette.divider;
  return {
    animation: false,
    grid: { left: 56, right: 16, top: 8, bottom: 28 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      backgroundColor: theme.palette.background.paper,
      borderColor: divider,
      textStyle: { color: theme.palette.text.primary, fontSize: 12 },
      formatter: (params: { value: [number, number] }[]) => {
        const [price, total] = params[0]?.value ?? [0, 0];
        const which = side === 'buy' ? 'or higher' : 'or lower';
        return `${formatNumber(price, 2)} ISK ${which}: ${formatNumber(total)} units`;
      },
    },
    xAxis: {
      type: 'value',
      scale: true,
      axisLabel: { color: muted, fontSize: 11, formatter: (value: number) => formatIsk(value) },
      axisLine: { lineStyle: { color: divider } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: muted, fontSize: 11, formatter: (value: number) => formatIsk(value) },
      splitLine: { lineStyle: { color: divider } },
    },
    series: [{
      type: 'line',
      step: side === 'buy' ? 'end' : 'start',
      data: points,
      symbol: 'none',
      lineStyle: { width: 2, color: line },
      areaStyle: { color: line, opacity: 0.15 },
    }],
  };
}
