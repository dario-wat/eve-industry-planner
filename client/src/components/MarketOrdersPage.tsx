import useAxios from 'axios-hooks';
import { ReactNode, useState } from 'react';
import { addDays, differenceInHours, formatDistanceToNowStrict } from 'date-fns';
import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { BookSide, CharacterContextRes, MarketOrdersRes } from '@internal/shared';
import OrderStandingCell, { standingRank } from 'components/OrderStandingCell';
import { formatIsk, formatNumber } from 'common/format';
import EveIconAndName from 'components/util/EveIconAndName';
import WorkspacePage, { WorkspaceSection } from 'components/util/WorkspacePage';
import { sideColor, SideChip } from 'components/market_history/tradeVisuals';

type Order = MarketOrdersRes[number];

const PAGE_SIZE = 100;
const EXPIRY_WARNING_HOURS = 48;

export default function MarketOrdersPage() {
  const [{ data, error }] = useAxios<MarketOrdersRes | null>('/market_orders');
  const [searchText, setSearchText] = useState('');

  const search = searchText.toLowerCase();
  const filtered = (data ?? []).filter(o =>
    o.name.toLowerCase().includes(search)
    || (o.locationName?.toLowerCase().includes(search) ?? false));
  const showCharacter = new Set((data ?? []).map(o => o.characterName)).size > 1;

  return (
    <WorkspacePage scroll>
      <Box
        sx={{
          pb: 1.5,
          flexShrink: 0,
          display: 'flex',
          gap: 3,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <TextField
          size="small"
          placeholder="Item or location"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
          }}
          sx={{ width: 260 }}
        />
        <OrderTotals orders={data ?? undefined} />
      </Box>
      {error && <Typography color="error" sx={{ pb: 1 }}>Could not load orders.</Typography>}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 2 }}>
        {(['sell', 'buy'] as const).map(side => (
          <OrdersSection
            key={side}
            side={side}
            orders={data === undefined ? undefined : filtered.filter(o => o.isBuy === (side === 'buy'))}
            showCharacter={showCharacter}
          />
        ))}
      </Box>
    </WorkspacePage>
  );
}

/** Slots and ISK tied up in orders across the logged-in characters. */
function OrderTotals({ orders }: { orders: MarketOrdersRes | undefined }) {
  const theme = useTheme();
  const [{ data }] = useAxios<CharacterContextRes | null>('/character_context');
  const loaded = (data ?? []).flatMap(c => (c.error === null ? [c] : []));
  const sum = (value: (c: typeof loaded[number]) => number) =>
    loaded.reduce((total, c) => total + value(c), 0);
  const perCharacter = (format: (c: typeof loaded[number]) => string) =>
    loaded.length > 1
      ? loaded.map(c => <div key={c.characterId}>{c.characterName}: {format(c)}</div>)
      : '';

  const outbid = orders?.filter(o => o.standing?.status === 'outbid').length;
  const slotsUsed = sum(c => c.orderSlotsUsed);
  const slots = sum(c => c.orderSlots);
  const slotsFull = slots > 0 && slotsUsed / slots >= 0.9;

  return (
    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
      <Stat
        label="Outbid"
        value={outbid === undefined ? '…' : formatNumber(outbid)}
        color={outbid ? 'warning.main' : 'success.main'}
        tooltip="Your orders with a better price ahead of them at the sell station"
      />
      {loaded.length > 0 && (
        <>
          <Stat
            label="Order slots"
            value={`${formatNumber(slotsUsed)} / ${formatNumber(slots)}`}
            color={slotsFull ? 'warning.main' : undefined}
            tooltip={<>
              Includes corporation orders
              {perCharacter(c => `${c.orderSlotsUsed} / ${c.orderSlots}`)}
            </>}
          />
          <Stat
            label="In buy orders"
            value={formatIsk(sum(c => c.buyOrderValue))}
            color={sideColor(theme, 'buy')}
            tooltip={<>
              Price × remaining volume, without corporation orders
              {perCharacter(c => formatIsk(c.buyOrderValue))}
            </>}
          />
          <Stat
            label="Listed for sale"
            value={formatIsk(sum(c => c.sellOrderValue))}
            color={sideColor(theme, 'sell')}
            tooltip={<>
              Price × remaining volume, without corporation orders
              {perCharacter(c => formatIsk(c.sellOrderValue))}
            </>}
          />
          <Stat
            label="Wallet"
            value={formatIsk(sum(c => c.walletBalance))}
            tooltip={perCharacter(c => formatIsk(c.walletBalance))}
          />
        </>
      )}
    </Box>
  );
}

function Stat(props: { label: string; value: string; color?: string; tooltip?: ReactNode }) {
  return (
    <Tooltip title={props.tooltip ?? ''}>
      <Box sx={{ cursor: props.tooltip ? 'help' : undefined }}>
        <Typography variant="caption" color="text.secondary" component="div" sx={{ lineHeight: 1.2 }}>
          {props.label}
        </Typography>
        <Typography variant="h6" sx={{ lineHeight: 1.2, fontWeight: 'bold', color: props.color }}>
          {props.value}
        </Typography>
      </Box>
    </Tooltip>
  );
}

function OrdersSection(props: {
  side: BookSide;
  orders: Order[] | undefined;
  showCharacter: boolean;
}) {
  const theme = useTheme();
  const { side, orders } = props;
  const color = sideColor(theme, side);
  const outbid = orders?.filter(o => o.standing?.status === 'outbid').length ?? 0;
  const value = orders?.reduce((total, o) => total + o.price * o.volumeRemain, 0) ?? 0;

  const title = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <SideChip side={side} />
      <span>{side === 'sell' ? 'Sell orders' : 'Buy orders'}</span>
      {orders !== undefined && (
        <Box component="span" sx={{ color: 'text.secondary', fontWeight: 'normal' }}>
          {formatNumber(orders.length)} · <Box component="span" sx={{ color }}>{formatIsk(value)}</Box>
          {outbid > 0 && (
            <>
              {' · '}
              <Box component="span" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                {formatNumber(outbid)} outbid
              </Box>
            </>
          )}
        </Box>
      )}
    </Box>
  );

  return (
    <WorkspaceSection title={title} fill={false}>
      <DataGrid
        autoHeight
        loading={orders === undefined}
        rows={orders ?? []}
        getRowId={row => row.orderId}
        columns={columns(color)}
        columnVisibilityModel={{ characterName: props.showCharacter }}
        getRowClassName={params => (params.row.standing?.status === 'outbid' ? 'order-outbid' : '')}
        initialState={{
          sorting: { sortModel: [{ field: 'standing', sort: 'asc' }] },
          pagination: { paginationModel: { pageSize: PAGE_SIZE } },
        }}
        pageSizeOptions={[PAGE_SIZE]}
        hideFooter={(orders?.length ?? 0) <= PAGE_SIZE}
        disableRowSelectionOnClick
        disableColumnMenu
        sx={{
          '& .order-outbid': {
            bgcolor: alpha(theme.palette.warning.main, 0.08),
            '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.14) },
          },
        }}
      />
    </WorkspaceSection>
  );
}

function expiryDate(order: Order): Date {
  return addDays(new Date(order.issuedDate), order.duration);
}

function columns(priceColor: string): GridColDef<Order>[] {
  const secondary = { color: 'text.secondary' };
  return [
    {
      field: 'name',
      headerName: 'Item',
      flex: 1,
      minWidth: 260,
      renderCell: params =>
        <EveIconAndName
          typeId={params.row.typeId}
          categoryId={params.row.categoryId}
          name={params.row.name}
          linkToItem
        />,
    },
    {
      field: 'price',
      headerName: 'Price',
      width: 130,
      align: 'right',
      headerAlign: 'right',
      renderCell: params =>
        <Box component="span" sx={{ color: priceColor, fontWeight: 'bold' }}>
          {formatNumber(params.row.price, 2)}
        </Box>,
    },
    {
      field: 'standing',
      headerName: 'Position',
      description: 'Against the book at the sell station set in Settings, from the latest 5-minute poll',
      width: 170,
      sortComparator: (a, b) => standingRank(a) - standingRank(b),
      renderCell: params =>
        <OrderStandingCell
          standing={params.row.standing}
          price={params.row.price}
          isBuy={params.row.isBuy}
        />,
    },
    {
      field: 'volumeRemain',
      headerName: 'Remaining',
      width: 130,
      align: 'right',
      headerAlign: 'right',
      renderCell: params =>
        <>
          {formatNumber(params.row.volumeRemain)}
          <Box component="span" sx={secondary}>&nbsp;/ {formatNumber(params.row.volumeTotal)}</Box>
        </>,
    },
    {
      field: 'value',
      headerName: 'Value',
      description: 'Price × remaining volume',
      width: 100,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (_value, row) => row.price * row.volumeRemain,
      valueFormatter: (value: number) => formatIsk(value),
    },
    {
      field: 'expires',
      headerName: 'Expires',
      width: 110,
      valueGetter: (_value, row) => expiryDate(row).getTime(),
      renderCell: params => {
        const expires = expiryDate(params.row);
        const soon = differenceInHours(expires, new Date()) < EXPIRY_WARNING_HOURS;
        return (
          <Box component="span" sx={soon ? { color: 'warning.main', fontWeight: 'bold' } : secondary}>
            {formatDistanceToNowStrict(expires, { addSuffix: true })}
          </Box>
        );
      },
    },
    {
      field: 'locationName',
      headerName: 'Location',
      width: 180,
      renderCell: params =>
        <Box component="span" sx={secondary}>
          {params.row.locationName ?? `Location ${params.row.locationId}`}
        </Box>,
    },
    {
      field: 'modifyFee',
      headerName: 'Undercut fee',
      description: 'Fee to modify this order to a slightly better price',
      width: 110,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value: number | null) => (value == null ? '—' : formatIsk(value)),
    },
    {
      field: 'replaceFee',
      headerName: 'Replace fee',
      description: 'Fee to cancel and place a new order instead. Modifying is cheaper unless the new order value is over 5 times the old.',
      width: 110,
      align: 'right',
      headerAlign: 'right',
      renderCell: params =>
        <Box component="span" sx={secondary}>
          {params.row.replaceFee == null ? '—' : formatIsk(params.row.replaceFee)}
        </Box>,
    },
    {
      field: 'characterName',
      headerName: 'Character',
      width: 140,
    },
  ];
}
