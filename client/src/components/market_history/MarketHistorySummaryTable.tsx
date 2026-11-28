import { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import HelpIcon from '@mui/icons-material/Help';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import {
  formatIsk,
  formatMaybe,
  formatNumber,
  formatNumberScale,
  formatShare,
  formatSignedPercent,
} from 'common/format';
import { MarketHistoryDay, WindowSummary, summarizeWindow } from './marketHistoryStats';

const WINDOWS = [7, 30, 90] as const;
const HEADLINE_WINDOW = 30;

const METRIC_HELP: Partial<Record<string, string>> = {
  priceChange: 'Median traded price compared with the previous window of the same length.',
  daysTraded: 'Days with at least one trade. Amber below 5 in 6 days, red below 2 in 3.',
  medianRange: 'Each day\'s high minus its low, divided by that day\'s high. '
    + 'The cell is the median of those days. Days with no trades are left out. '
    + 'A day that traded at a single price is 0%.',
  iskWeightedRange: 'The same daily high-to-low divided by the high, '
    + 'with each day weighted by the ISK traded that day. '
    + 'A day with more ISK moves the number more. Days with no trades are left out.',
  priceInRange: 'Where the day\'s average price sat between that day\'s low and high. '
    + '0% is the low and 100% is the high. The cell is the median of those days. '
    + 'Days with no trades, and days where the high and low were the same, are left out.',
};

type Metric = {
  id: string;
  label: string;
  cell: (summary: WindowSummary) => ReactNode;
};

const GROUPS: { title: string; metrics: Metric[] }[] = [
  {
    title: 'Volume',
    metrics: [
      { id: 'medianIsk', label: 'Median ISK / day', cell: s => formatIsk(s.medianIsk) },
      { id: 'medianUnits', label: 'Median units / day', cell: s => formatNumberScale(s.medianUnits) },
      {
        id: 'medianOrders',
        label: 'Median orders / day',
        cell: s => formatNumber(s.medianOrders, s.medianOrders >= 100 ? 0 : 1),
      },
      { id: 'daysTraded', label: 'Days traded', cell: s => <DaysTraded summary={s} /> },
    ],
  },
  {
    title: 'Price',
    metrics: [
      { id: 'medianPrice', label: 'Median price', cell: s => formatMaybe(s.medianPrice, formatIsk) },
      { id: 'priceChange', label: 'Price change', cell: s => <PriceChange change={s.priceChange} /> },
    ],
  },
  {
    title: 'Range',
    metrics: [
      { id: 'medianRange', label: 'Median range', cell: s => formatMaybe(s.medianRange, formatShare) },
      {
        id: 'iskWeightedRange',
        label: 'ISK-weighted range',
        cell: s => formatMaybe(s.iskWeightedRange, formatShare),
      },
      {
        id: 'priceInRange',
        label: 'Price in range',
        cell: s => formatMaybe(s.medianPriceInRange, formatShare),
      },
    ],
  },
];

/** The numbers that decide whether an item is worth trading, large, for the last 30 days. */
export function HistoryHeadline(props: { days: MarketHistoryDay[] }) {
  const summary = summarizeWindow(props.days, HEADLINE_WINDOW);
  if (summary === null) {
    return null;
  }
  return (
    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
      <Tile label="ISK / day" help="Median ISK traded per day">
        {formatIsk(summary.medianIsk)}
      </Tile>
      <Tile label="Days traded" help={METRIC_HELP.daysTraded}>
        <DaysTraded summary={summary} />
      </Tile>
      <Tile label="Price change" help={METRIC_HELP.priceChange}>
        <PriceChange change={summary.priceChange} />
      </Tile>
      <Tile label="Median range" help="Median of each day's high-to-low as a share of the high">
        {formatMaybe(summary.medianRange, formatShare)}
      </Tile>
      <Tile label="Units / day" help="Median units traded per day">
        {formatNumberScale(summary.medianUnits)}
      </Tile>
      <Tile label="Median price">{formatMaybe(summary.medianPrice, formatIsk)}</Tile>
    </Box>
  );
}

export default function MarketHistorySummaryTable(props: { days: MarketHistoryDay[] }) {
  const summaries = WINDOWS.map(windowDays => summarizeWindow(props.days, windowDays));
  return (
    <Table size="small" sx={{ whiteSpace: 'nowrap', '& td, & th': { py: 0.5 } }}>
      <TableHead>
        <TableRow>
          <TableCell />
          {WINDOWS.map(windowDays => (
            <TableCell
              key={windowDays}
              align="right"
              sx={windowDays === HEADLINE_WINDOW ? { fontWeight: 'bold' } : undefined}
            >
              {windowDays} days
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {GROUPS.map((group, groupIndex) => [
          <TableRow key={group.title}>
            <TableCell
              colSpan={WINDOWS.length + 1}
              sx={{
                bgcolor: 'action.selected',
                borderTop: groupIndex === 0 ? undefined : 2,
                borderTopColor: 'divider',
                color: 'text.primary',
                fontSize: 12,
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {group.title}
            </TableCell>
          </TableRow>,
          ...group.metrics.map(metric => (
            <TableRow key={metric.id}>
              <TableCell>
                <MetricLabel label={metric.label} help={METRIC_HELP[metric.id]} />
              </TableCell>
              {summaries.map((summary, index) => (
                <TableCell
                  key={WINDOWS[index]}
                  align="right"
                  sx={WINDOWS[index] === HEADLINE_WINDOW ? { fontWeight: 'bold' } : undefined}
                >
                  {summary === null ? '—' : metric.cell(summary)}
                </TableCell>
              ))}
            </TableRow>
          )),
        ])}
      </TableBody>
    </Table>
  );
}

function Tile(props: { label: string; help?: string; children: ReactNode }) {
  const label = (
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
      {props.label}
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
        minWidth: 120,
      }}
    >
      {props.help
        ? <Tooltip title={props.help}><Box sx={{ cursor: 'help' }}>{label}</Box></Tooltip>
        : label}
      <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
        {props.children}
      </Typography>
    </Box>
  );
}

function MetricLabel(props: { label: string; help?: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {props.label}
      {props.help != null &&
        <Tooltip title={props.help}>
          <Box component="span" sx={{ display: 'inline-flex' }}>
            <HelpIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          </Box>
        </Tooltip>
      }
    </Box>
  );
}

function daysTradedColor(summary: WindowSummary): string {
  const share = summary.daysTraded / summary.windowDays;
  if (share >= 5 / 6) {
    return 'success.main';
  }
  return share >= 2 / 3 ? 'warning.main' : 'error.main';
}

function DaysTraded({ summary }: { summary: WindowSummary }) {
  return (
    <Box component="span" sx={{ color: daysTradedColor(summary) }}>
      {summary.daysTraded}
      <Box component="span" sx={{ color: 'text.secondary', fontWeight: 'normal', fontSize: '0.75em' }}>
        {' / '}{summary.windowDays}
      </Box>
    </Box>
  );
}

function PriceChange({ change }: { change: number | null }) {
  if (change === null) {
    return <>—</>;
  }
  const Arrow = change >= 0 ? ArrowDropUpIcon : ArrowDropDownIcon;
  return (
    <Box
      component="span"
      sx={{
        color: change === 0 ? 'text.secondary' : change > 0 ? 'success.main' : 'error.main',
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      {change !== 0 && <Arrow sx={{ fontSize: '1.4em', mx: -0.5 }} />}
      {formatSignedPercent(change)}
    </Box>
  );
}
