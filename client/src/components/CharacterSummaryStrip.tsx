import useAxios from 'axios-hooks';
import { ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { CharacterContextRes } from '@internal/shared';
import { formatIsk, formatNumber } from 'common/format';

export default function CharacterSummaryStrip() {
  const [{ data, error }] = useAxios<CharacterContextRes | null>('/character_context');

  if (error) {
    return <Alert severity="error" sx={{ mb: 1 }}>Could not load the character summary.</Alert>;
  }
  if (data === undefined) {
    return <Typography variant="body2" sx={{ pb: 1 }}>Loading characters…</Typography>;
  }
  if (data === null || data.length === 0) {
    return null;
  }

  const loaded = data.flatMap(c => (c.error === null ? [c] : []));
  const total = (value: (c: typeof loaded[number]) => number) =>
    loaded.reduce((sum, c) => sum + value(c), 0);

  return (
    <Box
      sx={{
        flexShrink: 0,
        alignSelf: 'flex-start',
        maxWidth: 1,
        maxHeight: 240,
        overflow: 'auto',
        mb: 1,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Table size="small" stickyHeader sx={{ width: 'auto', whiteSpace: 'nowrap' }}>
        <TableHead>
          <TableRow>
            <TableCell>Character</TableCell>
            <TableCell align="right">
              <Tooltip title="Includes corporation orders">
                <span>Order slots</span>
              </Tooltip>
            </TableCell>
            <TableCell align="right">Wallet</TableCell>
            <TableCell align="right">
              <Tooltip title="Price × remaining volume, without corporation orders">
                <span>In buy orders</span>
              </Tooltip>
            </TableCell>
            <TableCell align="right">
              <Tooltip title="Price × remaining volume, without corporation orders">
                <span>Listed for sale</span>
              </Tooltip>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map(c => (
            c.error === null
              ? (
                <SummaryRow
                  key={c.characterId}
                  label={c.characterName}
                  slotsUsed={c.orderSlotsUsed}
                  slots={c.orderSlots}
                  wallet={c.walletBalance}
                  buy={c.buyOrderValue}
                  sell={c.sellOrderValue}
                />
              )
              : (
                <TableRow key={c.characterId}>
                  <TableCell>{c.characterName}</TableCell>
                  <TableCell colSpan={4} sx={{ color: 'error.main' }}>{c.error}</TableCell>
                </TableRow>
              )
          ))}
          {loaded.length > 1 &&
            <SummaryRow
              bold
              label={loaded.length < data.length ? 'Total (loaded characters)' : 'Total'}
              slotsUsed={total(c => c.orderSlotsUsed)}
              slots={total(c => c.orderSlots)}
              wallet={total(c => c.walletBalance)}
              buy={total(c => c.buyOrderValue)}
              sell={total(c => c.sellOrderValue)}
            />
          }
        </TableBody>
      </Table>
    </Box>
  );
}

function SummaryRow(props: {
  label: string;
  slotsUsed: number;
  slots: number;
  wallet: number;
  buy: number;
  sell: number;
  bold?: boolean;
}) {
  const cell = (content: ReactNode) => (
    <TableCell align="right" sx={{ fontWeight: props.bold ? 'bold' : undefined }}>
      {content}
    </TableCell>
  );
  return (
    <TableRow>
      <TableCell sx={{ fontWeight: props.bold ? 'bold' : undefined }}>{props.label}</TableCell>
      {cell(`${formatNumber(props.slotsUsed)} / ${formatNumber(props.slots)}`)}
      {cell(<IskValue value={props.wallet} />)}
      {cell(<IskValue value={props.buy} />)}
      {cell(<IskValue value={props.sell} />)}
    </TableRow>
  );
}

function IskValue({ value }: { value: number }) {
  return (
    <Tooltip title={`${formatNumber(value, 2)} ISK`}>
      <span>{formatIsk(value)}</span>
    </Tooltip>
  );
}
