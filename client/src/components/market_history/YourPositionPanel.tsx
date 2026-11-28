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
import { useTheme } from '@mui/material/styles';
import { addDays, formatDistanceToNowStrict, subDays } from 'date-fns';
import { BookSide, MarketOrdersRes, WalletTransactionsRes } from '@internal/shared';
import { formatIsk, formatNumber, formatShare } from 'common/format';
import { PanelLoading, profitColor, sideColor, SideChip } from './tradeVisuals';
import OrderStandingCell from 'components/OrderStandingCell';

const SUMMARY_DAYS = 30;
const RECENT_FILLS = 5;

/** The selected characters' open orders and recent trades for one item. */
export default function YourPositionPanel({ typeId }: { typeId: number }) {
  const [{ data: orders, error: ordersError }] =
    useAxios<MarketOrdersRes | null>(`/market_orders?typeId=${typeId}`);
  const [{ data: transactions, error: transactionsError }] =
    useAxios<WalletTransactionsRes | null>(`/wallet_transactions?typeId=${typeId}`);

  return (
    <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Open orders</Typography>
        {ordersError
          ? <Typography color="error" variant="body2">Could not load orders.</Typography>
          : orders === undefined
            ? <PanelLoading />
            : <OrdersTable orders={orders ?? []} />}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Your trades, last {SUMMARY_DAYS} days</Typography>
        {transactionsError
          ? <Typography color="error" variant="body2">Could not load transactions.</Typography>
          : transactions === undefined
            ? <PanelLoading />
            : <TradesSummary transactions={transactions ?? []} />}
      </Box>
    </Box>
  );
}

function OrdersTable({ orders }: { orders: MarketOrdersRes }) {
  const theme = useTheme();
  const sorted = useMemo(
    () => [...orders].sort((a, b) => Number(a.isBuy) - Number(b.isBuy) || a.price - b.price),
    [orders],
  );
  if (sorted.length === 0) {
    return <Typography variant="body2" color="text.secondary">No open orders.</Typography>;
  }
  const showCharacter = new Set(sorted.map(order => order.characterName)).size > 1;
  return (
    <CompactTable
      head={['', 'Price', 'Position', 'Remaining', 'Location', 'Expires', ...(showCharacter ? ['Character'] : [])]}
      rightAligned={[1, 3]}
    >
      {sorted.map((order, index) => {
        const side: BookSide = order.isBuy ? 'buy' : 'sell';
        const location = order.locationName ?? `Location ${order.locationId}`;
        return (
          <TableRow key={index}>
            <TableCell><SideChip side={side} /></TableCell>
            <TableCell align="right" sx={{ color: sideColor(theme, side), fontWeight: 'bold' }}>
              {formatNumber(order.price, 2)}
            </TableCell>
            <TableCell>
              <OrderStandingCell standing={order.standing} price={order.price} isBuy={order.isBuy} />
            </TableCell>
            <TableCell align="right">
              {formatNumber(order.volumeRemain)}
              <Box component="span" sx={{ color: 'text.secondary' }}>
                {' / '}{formatNumber(order.volumeTotal)}
              </Box>
            </TableCell>
            <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <Tooltip title={location}><span>{location}</span></Tooltip>
            </TableCell>
            <TableCell>
              {formatDistanceToNowStrict(
                addDays(new Date(order.issuedDate), order.duration),
                { addSuffix: true, unit: 'day' },
              )}
            </TableCell>
            {showCharacter && <TableCell>{order.characterName}</TableCell>}
          </TableRow>
        );
      })}
    </CompactTable>
  );
}

type SideTotals = { units: number; isk: number; average: number | null; last: string | null };

function sideTotals(transactions: WalletTransactionsRes): SideTotals {
  const units = transactions.reduce((total, t) => total + t.quantity, 0);
  const isk = transactions.reduce((total, t) => total + t.quantity * t.unitPrice, 0);
  return {
    units,
    isk,
    average: units === 0 ? null : isk / units,
    last: transactions[0]?.date ?? null,
  };
}

function TradesSummary({ transactions }: { transactions: WalletTransactionsRes }) {
  const theme = useTheme();
  const sorted = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)),
    [transactions],
  );
  const since = subDays(new Date(), SUMMARY_DAYS);
  const recent = sorted.filter(t => new Date(t.date) >= since);

  if (recent.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {sorted.length === 0
          ? 'Never traded.'
          : `No trades. The last one was ${ago(sorted[0].date)}.`}
      </Typography>
    );
  }

  const bought = sideTotals(recent.filter(t => t.isBuy));
  const sold = sideTotals(recent.filter(t => !t.isBuy));
  const spread = bought.average !== null && sold.average !== null
    ? sold.average - bought.average
    : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <CompactTable head={['', 'Units', 'Avg price', 'ISK', 'Last']} rightAligned={[1, 2, 3]}>
        {([['buy', bought], ['sell', sold]] as const).map(([side, totals]) => (
          <TableRow key={side}>
            <TableCell><SideChip side={side} /></TableCell>
            <TableCell align="right">{formatNumber(totals.units)}</TableCell>
            <TableCell align="right" sx={{ color: sideColor(theme, side), fontWeight: 'bold' }}>
              {totals.average === null ? '—' : formatNumber(totals.average, 2)}
            </TableCell>
            <TableCell align="right">{formatIsk(totals.isk)}</TableCell>
            <TableCell sx={{ color: 'text.secondary' }}>
              {totals.last === null ? '—' : ago(totals.last)}
            </TableCell>
          </TableRow>
        ))}
      </CompactTable>
      {spread !== null && bought.average !== null && (
        <Tooltip title="Average sell price minus average buy price, before broker fees and tax">
          <Typography variant="body2" sx={{ cursor: 'help', width: 'fit-content' }}>
            Spread{' '}
            <Box component="span" sx={{ color: profitColor(spread), fontWeight: 'bold' }}>
              {formatNumber(spread, 2)} ({formatShare(spread / bought.average)})
            </Box>
            {' '}per unit
          </Typography>
        </Tooltip>
      )}
      <Typography variant="caption" color="text.secondary">Latest fills</Typography>
      <CompactTable head={['', 'Quantity', 'Price', 'When']} rightAligned={[1, 2]}>
        {recent.slice(0, RECENT_FILLS).map((t, index) => {
          const side: BookSide = t.isBuy ? 'buy' : 'sell';
          return (
            <TableRow key={index}>
              <TableCell><SideChip side={side} /></TableCell>
              <TableCell align="right">{formatNumber(t.quantity)}</TableCell>
              <TableCell align="right" sx={{ color: sideColor(theme, side) }}>
                {formatNumber(t.unitPrice, 2)}
              </TableCell>
              <TableCell sx={{ color: 'text.secondary' }}>
                <Tooltip title={`${t.characterName} · ${t.locationName ?? t.locationId}`}>
                  <span>{ago(t.date)}</span>
                </Tooltip>
              </TableCell>
            </TableRow>
          );
        })}
      </CompactTable>
    </Box>
  );
}

function ago(date: string): string {
  return formatDistanceToNowStrict(new Date(date), { addSuffix: true });
}

function CompactTable(props: { head: string[]; rightAligned: number[]; children: ReactNode }) {
  return (
    <Table size="small" sx={{ width: 'auto', whiteSpace: 'nowrap' }}>
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
