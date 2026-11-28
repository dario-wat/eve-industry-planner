import useAxios from 'axios-hooks';
import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { alpha, Theme, useTheme } from '@mui/material/styles';
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
import { PanelLoading, sideColor, SideChip } from './tradeVisuals';

/** The chart covers prices within this share of the best one; the table lists every order. */
const CHART_PRICE_SPAN = 0.25;

const SYSTEM_NAMES: Record<number, string> = {
  30000142: 'Jita',
  30000144: 'Perimeter',
};

type LocationNames = TradeBookRes['locationNames'];

type BookRow = TradeBookOrderRes & { total: number };

/**
 * What new orders compete with at the sell station, where the trading happens: buy orders sellers
 * there can fill, wherever they were placed, and the sell orders there.
 */
export default function OrderBookPanel({ typeId }: { typeId: number }) {
  const [{ data: feeData }] = useAxios<TradeFeeRatesRes | null>('/trade_fee_rates');
  const [{ data: book, error }] = useAxios<TradeBookRes | null>(`/trade_book/${typeId}`);

  if (error) {
    return <Typography color="error" variant="body2">Could not load the order book.</Typography>;
  }
  if (feeData === undefined || book === undefined) {
    return <PanelLoading />;
  }
  if (feeData === null || book === null) {
    return null;
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
        title="Buy orders a seller at the sell station can fill"
        location={feeData.sellLocation}
        side="buy"
        orders={book.orders}
        locationNames={book.locationNames}
      />
      <BookSideView
        title="Sell orders here"
        location={feeData.sellLocation}
        side="sell"
        orders={book.orders}
        locationNames={book.locationNames}
      />
    </Box>
  );
}

function BookSideView(props: {
  title: string;
  location: TradeLocationRes;
  side: BookSide;
  orders: TradeBookOrderRes[];
  locationNames: LocationNames;
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
  const color = sideColor(theme, props.side);

  return (
    <Box sx={{ minWidth: 0, borderTop: 3, borderColor: color, pt: 1 }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <SideChip side={props.side} />
        <Typography variant="subtitle2">{props.title}</Typography>
      </Box>
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
                    <TableCell>Placed at</TableCell>
                    {isBuy && <TableCell>Range</TableCell>}
                    {isBuy && <TableCell align="right">Min volume</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow
                      key={row.orderId}
                      sx={{
                        bgcolor: index === 0 ? alpha(color, 0.12) : undefined,
                        '& td': row.locationId === props.location.locationId
                          ? undefined
                          : { color: 'text.secondary' },
                      }}
                    >
                      <TableCell
                        align="right"
                        sx={{ fontWeight: index === 0 ? 'bold' : undefined, color: `${color} !important` }}
                      >
                        {formatNumber(row.price, 2)}
                      </TableCell>
                      <TableCell align="right">{formatNumber(row.volumeRemain)}</TableCell>
                      <TableCell align="right">{formatNumber(row.total)}</TableCell>
                      <TableCell>{placedAt(row, props.locationNames)}</TableCell>
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

function placedAt(order: TradeBookOrderRes, locationNames: LocationNames): string {
  const system = SYSTEM_NAMES[order.systemId] ?? `System ${order.systemId}`;
  return locationNames[order.locationId] ?? `${system} ${order.locationId}`;
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
  const line = sideColor(theme, side);
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
