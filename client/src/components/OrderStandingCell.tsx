import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { OrderStandingRes } from '@internal/shared';
import { formatNumber } from 'common/format';

/** On top, outbid by how much, or not trading at the sell station. */
export default function OrderStandingCell(props: {
  standing: OrderStandingRes | null;
  price: number;
  isBuy: boolean;
}) {
  const { standing } = props;
  if (standing === null) {
    return <Box component="span" sx={{ color: 'text.secondary' }}>—</Box>;
  }
  switch (standing.status) {
    case 'top': {
      const lead = standing.nextPrice === null
        ? null
        : Math.abs(props.price - standing.nextPrice);
      return (
        <Tooltip
          title={lead === null
            ? 'No competing orders'
            : `Next best ${formatNumber(standing.nextPrice!, 2)}, ${formatNumber(lead, 2)} ISK behind`}
        >
          <Box component="span" sx={{ color: 'success.main', fontWeight: 'bold' }}>On top</Box>
        </Tooltip>
      );
    }
    case 'outbid': {
      const gap = Math.abs(standing.bestPrice - props.price);
      const where = standing.bestLocationName ?? 'another station';
      return (
        <Tooltip
          title={`Best ${formatNumber(standing.bestPrice, 2)} at ${where}. `
            + `${standing.ordersAhead} order${standing.ordersAhead === 1 ? '' : 's'} ahead of yours.`}
        >
          <Box component="span" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
            {gap === 0 ? 'Tied, older ahead' : `Outbid by ${formatNumber(gap, 2)}`}
          </Box>
        </Tooltip>
      );
    }
    default:
      return (
        <Tooltip
          title={props.isBuy
            ? 'This buy order\'s range does not reach the sell station, so sellers there cannot fill it.'
            : 'This sell order is not at the sell station set in Settings.'}
        >
          <Box component="span" sx={{ color: 'text.secondary' }}>
            {props.isBuy ? 'Doesn\'t reach' : 'Not at'} {standing.stationName ?? 'sell station'}
          </Box>
        </Tooltip>
      );
  }
}

/** For sorting: outbid first, then away, then on top. */
export function standingRank(standing: OrderStandingRes | null): number {
  switch (standing?.status) {
    case 'outbid':
      return 0;
    case 'away':
      return 1;
    case 'top':
      return 2;
    default:
      return 3;
  }
}
