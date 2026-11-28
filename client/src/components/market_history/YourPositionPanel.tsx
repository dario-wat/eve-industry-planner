import useAxios from 'axios-hooks';
import { ReactNode, useMemo } from 'react';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { addDays, format, formatDistanceToNowStrict, subDays } from 'date-fns';
import { MarketOrdersRes, WalletTransactionsRes } from '@internal/shared';
import { formatIsk, formatNumber } from 'common/format';

const SUMMARY_DAYS = 30;

/** The selected characters' open orders and transactions for one item. */
export default function YourPositionPanel({ typeId }: { typeId: number }) {
  const [{ data: orders, error: ordersError }] =
    useAxios<MarketOrdersRes | null>(`/market_orders?typeId=${typeId}`);
  const [{ data: transactions, error: transactionsError }] =
    useAxios<WalletTransactionsRes | null>(`/wallet_transactions?typeId=${typeId}`);

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Open orders</Typography>
        {ordersError
          ? <Typography color="error" variant="body2">Could not load orders.</Typography>
          : orders == null
            ? <Typography variant="body2">Loading orders…</Typography>
            : <OrdersTable orders={orders} />}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Transactions</Typography>
        {transactionsError
          ? <Typography color="error" variant="body2">Could not load transactions.</Typography>
          : transactions == null
            ? <Typography variant="body2">Loading transactions…</Typography>
            : <TransactionsView transactions={transactions} />}
      </Box>
    </Box>
  );
}

function OrdersTable({ orders }: { orders: MarketOrdersRes }) {
  const sorted = useMemo(
    () => [...orders].sort((a, b) => Number(a.isBuy) - Number(b.isBuy) || a.price - b.price),
    [orders],
  );
  if (sorted.length === 0) {
    return <Typography variant="body2" color="text.secondary">No open orders.</Typography>;
  }
  return (
    <ScrollTable
      head={['Side', 'Price', 'Remaining', 'Location', 'Expires', 'Character']}
      rightAligned={[1, 2]}
    >
      {sorted.map((order, index) => (
        <TableRow key={index}>
          <TableCell>{order.isBuy ? 'Buy' : 'Sell'}</TableCell>
          <TableCell align="right">{formatNumber(order.price, 2)}</TableCell>
          <TableCell align="right">
            {formatNumber(order.volumeRemain)} / {formatNumber(order.volumeTotal)}
          </TableCell>
          <TableCell>{order.locationName ?? `Location ${order.locationId}`}</TableCell>
          <TableCell>
            {formatDistanceToNowStrict(
              addDays(new Date(order.issuedDate), order.duration),
              { addSuffix: true, unit: 'day' },
            )}
          </TableCell>
          <TableCell>{order.characterName}</TableCell>
        </TableRow>
      ))}
    </ScrollTable>
  );
}

function TransactionsView({ transactions }: { transactions: WalletTransactionsRes }) {
  const sorted = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)),
    [transactions],
  );
  const since = subDays(new Date(), SUMMARY_DAYS);
  const recent = sorted.filter(t => new Date(t.date) >= since);
  if (sorted.length === 0) {
    return <Typography variant="body2" color="text.secondary">No transactions.</Typography>;
  }
  return (
    <>
      <Table size="small" sx={{ width: 'auto', mb: 1, whiteSpace: 'nowrap' }}>
        <TableHead>
          <TableRow>
            <TableCell>Last {SUMMARY_DAYS} days</TableCell>
            <TableCell align="right">Units</TableCell>
            <TableCell align="right">Avg price</TableCell>
            <TableCell align="right">ISK</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <SummaryRow label="Bought" transactions={recent.filter(t => t.isBuy)} />
          <SummaryRow label="Sold" transactions={recent.filter(t => !t.isBuy)} />
        </TableBody>
      </Table>
      <ScrollTable
        head={['Time', 'Side', 'Quantity', 'Unit price', 'Total', 'Location', 'Character']}
        rightAligned={[2, 3, 4]}
      >
        {sorted.map((t, index) => (
          <TableRow key={index}>
            <TableCell>{format(new Date(t.date), 'yyyy.MM.dd HH:mm')}</TableCell>
            <TableCell>{t.isBuy ? 'Buy' : 'Sell'}</TableCell>
            <TableCell align="right">{formatNumber(t.quantity)}</TableCell>
            <TableCell align="right">{formatNumber(t.unitPrice, 2)}</TableCell>
            <TableCell align="right">{formatIsk(t.quantity * t.unitPrice)}</TableCell>
            <TableCell>{t.locationName ?? `Location ${t.locationId}`}</TableCell>
            <TableCell>{t.characterName}</TableCell>
          </TableRow>
        ))}
      </ScrollTable>
    </>
  );
}

function SummaryRow(props: { label: string; transactions: WalletTransactionsRes }) {
  const units = props.transactions.reduce((total, t) => total + t.quantity, 0);
  const isk = props.transactions.reduce((total, t) => total + t.quantity * t.unitPrice, 0);
  return (
    <TableRow>
      <TableCell>{props.label}</TableCell>
      <TableCell align="right">{formatNumber(units)}</TableCell>
      <TableCell align="right">{units === 0 ? '—' : formatNumber(isk / units, 2)}</TableCell>
      <TableCell align="right">{formatIsk(isk)}</TableCell>
    </TableRow>
  );
}

function ScrollTable(props: { head: string[]; rightAligned: number[]; children: ReactNode }) {
  return (
    <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
      <Table size="small" stickyHeader sx={{ whiteSpace: 'nowrap' }}>
        <TableHead>
          <TableRow>
            {props.head.map((label, index) => (
              <TableCell key={label} align={props.rightAligned.includes(index) ? 'right' : 'left'}>
                {label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>{props.children}</TableBody>
      </Table>
    </Box>
  );
}
