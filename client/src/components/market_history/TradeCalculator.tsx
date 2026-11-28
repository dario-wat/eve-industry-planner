import useAxios from 'axios-hooks';
import { ReactNode, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  BookSide,
  competingOrders,
  FeeRates,
  relistBudget,
  roundTrip,
  RoundTripInput,
  TradeBookOrderRes,
  TradeBookRes,
  TradeFeeRatesRes,
  TradeLocationRes,
} from '@internal/shared';
import { formatIsk, formatNumber, formatShare } from 'common/format';
import { PanelLoading, profitColor, sideColor, SideChip } from './tradeVisuals';

/**
 * Buy order at the buy station, sell order at the sell station (both set in Settings), at the
 * price to compete with in the stored book, with the character's fees.
 */
export default function TradeCalculator({ typeId }: { typeId: number }) {
  const [{ data: feeData, error: feeError }] =
    useAxios<TradeFeeRatesRes | null>('/trade_fee_rates');
  const [{ data: book, error: bookError }] =
    useAxios<TradeBookRes | null>(`/trade_book/${typeId}`);

  const [pickedCharacterId, setPickedCharacterId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('1');

  if (feeError) {
    return <Alert severity="error">Could not load fee rates.</Alert>;
  }
  if (feeData === undefined) {
    return <PanelLoading />;
  }
  if (feeData === null) {
    return null;
  }

  const characters = feeData.characters;
  if (characters.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Pick a logged-in character in the character selector.
      </Typography>
    );
  }
  const character = characters.find(c => c.characterId === pickedCharacterId) ?? characters[0];
  const buyRates = character.error === null ? character.buyRates : null;
  const sellRates = character.error === null ? character.sellRates : null;
  const buyPrice = topCompetingPrice(book?.orders ?? [], feeData.buyLocation, 'buy');
  const sellPrice = topCompetingPrice(book?.orders ?? [], feeData.sellLocation, 'sell');

  const input: RoundTripInput | null = buyRates && sellRates
    && buyPrice !== null && sellPrice !== null && positive(quantity)
    ? {
      buy: { price: buyPrice, rates: buyRates, mode: 'order' },
      sell: { price: sellPrice, rates: sellRates, mode: 'order' },
      quantity: Number(quantity),
    }
    : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        {characters.length === 1
          ? <Typography variant="subtitle2" sx={{ mr: 1 }}>{character.characterName}</Typography>
          : (
            <TextField
              select
              size="small"
              label="Character"
              value={character.characterId}
              onChange={e => setPickedCharacterId(Number(e.target.value))}
              sx={{ width: 200 }}
            >
              {characters.map(c => (
                <MenuItem key={c.characterId} value={c.characterId}>{c.characterName}</MenuItem>
              ))}
            </TextField>
          )
        }
        <NumberField label="Quantity" value={quantity} onChange={setQuantity} />
        {book?.observedAt &&
          <Typography variant="body2" color="text.secondary">
            Latest change to these orders{' '}
            {formatDistanceToNowStrict(new Date(book.observedAt), { addSuffix: true })}
          </Typography>
        }
      </Box>
      {character.error !== null &&
        <Alert severity="warning">
          No fee rates for {character.characterName}: {character.error}
        </Alert>
      }
      {bookError && <Alert severity="error">Could not load the order book.</Alert>}
      {book === undefined && !bookError && <PanelLoading />}
      {book !== undefined && (
        <>
          <Leg
            side="buy"
            location={feeData.buyLocation}
            price={buyPrice}
            missingPrice="No buy orders reach here"
            rates={buyRates}
          />
          <Leg
            side="sell"
            location={feeData.sellLocation}
            price={sellPrice}
            missingPrice="No sell orders here"
            rates={sellRates}
          />
          {input === null
            ? (
              <Typography variant="body2" color="text.secondary">
                {positive(quantity) ? 'Nothing to calculate without prices and fees.' : 'Enter a quantity.'}
              </Typography>
            )
            : <TradeResults input={input} />
          }
        </>
      )}
    </Box>
  );
}

/**
 * The best price your new order competes with. A buy order competes with every buy order that
 * accepts sales at the station, wherever it was placed.
 */
function topCompetingPrice(
  orders: TradeBookOrderRes[],
  location: TradeLocationRes,
  side: BookSide,
): number | null {
  return competingOrders(orders, location, side)[0]?.price ?? null;
}

function Leg(props: {
  side: BookSide;
  location: TradeLocationRes;
  price: number | null;
  missingPrice: string;
  rates: FeeRates | null;
}) {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'baseline', flexWrap: 'wrap' }}>
      <SideChip side={props.side} />
      <Typography variant="body2" sx={{ minWidth: 330 }}>
        {props.location.name ?? `Location ${props.location.locationId}`}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          minWidth: 140,
          fontWeight: 'bold',
          color: props.price === null ? 'text.secondary' : sideColor(theme, props.side),
        }}
      >
        {props.price === null ? props.missingPrice : isk(props.price)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {props.rates === null
          ? 'Fees unknown here'
          : `Broker ${formatPercent(props.rates.brokerRate)} · Tax ${formatPercent(props.rates.salesTaxRate)}`}
      </Typography>
    </Box>
  );
}

function TradeResults({ input }: { input: RoundTripInput }) {
  const trip = roundTrip(input);
  const budget = relistBudget(input);
  const color = profitColor(trip.netProfit);
  const relists = (count: number | null) => {
    if (count === null) {
      return 'Not relisted';
    }
    return (
      <Box component="span" sx={{ color: count === 0 ? 'error.main' : undefined }}>
        {formatNumber(count)}
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box
        sx={{
          display: 'flex',
          gap: 4,
          flexWrap: 'wrap',
          alignItems: 'baseline',
          borderLeft: 4,
          borderColor: color,
          pl: 1.5,
          py: 0.5,
        }}
      >
        <Headline label="Net profit" color={color}>{isk(trip.netProfit)}</Headline>
        <Headline label="ROI" color={color} help="Net profit over capital">
          {formatShare(trip.roi)}
        </Headline>
        <Headline label="Per unit" color={color}>{isk(trip.profitPerUnit)}</Headline>
      </Box>
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <ResultTable rows={[
          ['Buy broker fee', isk(trip.buyBrokerFee)],
          ['Sell broker fee', isk(trip.sellBrokerFee)],
          ['Sales tax', isk(trip.salesTax)],
          ['Capital', isk(trip.capital), 'Paid before the sale: buy value and both broker fees'],
        ]} />
        <ResultTable rows={[
          ['Breakeven sell price', isk(trip.breakevenSellPrice), 'Includes the 100 ISK minimum fees'],
          ['Fee per buy relist', isk(budget.buyRelistFee), 'A small reprice at about the same order value'],
          ['Fee per sell relist', isk(budget.sellRelistFee), 'A small reprice at about the same order value'],
          ['Max buy relists', relists(budget.maxBuyRelists), 'If the sell order is never relisted'],
          ['Max sell relists', relists(budget.maxSellRelists), 'If the buy order is never relisted'],
        ]} />
      </Box>
    </Box>
  );
}

function Headline(props: { label: string; color: string; help?: string; children: ReactNode }) {
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
      <Typography variant="h6" sx={{ color: props.color, fontWeight: 'bold', lineHeight: 1.2 }}>
        {props.children}
      </Typography>
    </Box>
  );
}

function ResultTable({ rows }: { rows: [string, ReactNode, string?][] }) {
  return (
    <Table size="small" sx={{ width: 'auto', whiteSpace: 'nowrap' }}>
      <TableBody>
        {rows.map(([label, value, help]) => (
          <TableRow key={label}>
            <TableCell sx={{ color: 'text.secondary' }}>
              {help
                ? <Tooltip title={help}><span style={{ cursor: 'help' }}>{label}</span></Tooltip>
                : label}
            </TableCell>
            <TableCell align="right">{value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function NumberField(props: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <TextField
      size="small"
      label={props.label}
      value={props.value}
      onChange={e => props.onChange(e.target.value)}
      sx={{ width: 150 }}
    />
  );
}

function isk(value: number): ReactNode {
  return (
    <Tooltip title={`${formatNumber(value, 2)} ISK`}>
      <span>{formatIsk(value)}</span>
    </Tooltip>
  );
}

function positive(text: string): boolean {
  const value = Number(text);
  return text.trim() !== '' && Number.isFinite(value) && value > 0;
}

function formatPercent(rate: number): string {
  return `${formatNumber(rate * 100, 3)}%`;
}
