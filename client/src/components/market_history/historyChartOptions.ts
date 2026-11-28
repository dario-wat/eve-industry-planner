import { addDays, format, subMonths, subYears } from 'date-fns';
import type { ComposeOption } from 'echarts/core';
import type { BarSeriesOption, LineSeriesOption } from 'echarts/charts';
import type {
  GridComponentOption,
  LegendComponentOption,
  TooltipComponentOption,
} from 'echarts/components';
import { formatIsk, formatNumber, formatPercentPoints } from 'common/format';
import { MarketHistoryDay, rollingMedian } from './marketHistoryStats';

export const CHART_SPANS = [
  { id: '90d', label: '90 days' },
  { id: '6m', label: '6 months' },
  { id: '1y', label: '1 year' },
  { id: 'full', label: 'Full' },
] as const;

export type ChartSpan = typeof CHART_SPANS[number]['id'];

/** Charts in this group share one hover crosshair. */
export const HISTORY_CHART_GROUP = 'itemHistory';

export type EChartsOption = ComposeOption<
  | LineSeriesOption
  | BarSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
>;

/**
 * One accent for the item's own numbers, a second hue for the 30-day reference line.
 * Series names must differ between charts: linked charts also share legend toggles by name.
 */
export type ChartColors = {
  accent: string;
  /** Daily values behind the lines; neutral so the lines stand out. */
  bars: string;
  band: string;
  reference: string;
  text: string;
  muted: string;
  divider: string;
  paper: string;
  fontFamily: string;
};

const BAND = 'band';
const BAND_NAME = 'High / low';

type TooltipItem = {
  seriesName?: string;
  marker?: string;
  value?: number | string | null;
  axisValueLabel?: string;
  dataIndex?: number;
};

export function priceChartOption(
  days: MarketHistoryDay[],
  span: ChartSpan,
  colors: ChartColors,
): EChartsOption {
  const median7 = rollingMedian(days, day => day.average, 7);
  const median30 = rollingMedian(days, day => day.average, 30);
  const shown = visibleDays(days, span);
  const count = shown.length;
  return {
    ...frame(colors),
    legend: legend(colors, ['Average', '30-day median price', '7-day median price', BAND_NAME], {
      '7-day median price': false,
    }),
    tooltip: axisTooltip(colors, (items) => {
      const rows = items.flatMap(item => {
        const value = numeric(item.value);
        if (value === null || item.seriesName === BAND_NAME || item.seriesName?.startsWith(BAND)) {
          return [];
        }
        return [`${item.marker ?? ''}${item.seriesName}: ${formatIsk(value)}`];
      });
      const day = shown[items[0]?.dataIndex ?? -1];
      if (day?.high != null && day.low != null) {
        rows.push(`High ${formatIsk(day.high)} · Low ${formatIsk(day.low)}`);
      }
      return rows;
    }),
    xAxis: categoryAxis(shown, colors),
    yAxis: valueAxis(colors, formatIsk, { scale: true }),
    series: [
      bandBase(shown.map(day => day.low)),
      bandSpan(BAND_NAME, shown.map(day => day.rangeWidth), colors.band),
      line('30-day median price', median30.slice(-count), colors.reference, 1.5),
      line('7-day median price', median7.slice(-count), colors.accent, 1.5, { dashed: true }),
      line('Average', shown.map(day => day.average), colors.accent, 2.5),
    ],
  };
}

/** Daily ISK traded as bars, so days with no trades show as gaps, with medians on top. */
export function volumeChartOption(
  days: MarketHistoryDay[],
  span: ChartSpan,
  colors: ChartColors,
): EChartsOption {
  const median7 = rollingMedian(days, day => day.iskVolume, 7);
  const median30 = rollingMedian(days, day => day.iskVolume, 30);
  const shown = visibleDays(days, span);
  const count = shown.length;
  return {
    ...frame(colors),
    legend: legend(colors, ['Daily ISK', '7-day median ISK', '30-day median ISK']),
    tooltip: axisTooltip(colors, (items) => {
      const day = shown[items[0]?.dataIndex ?? -1];
      const rows = items.flatMap(item => {
        const value = numeric(item.value);
        return value === null ? [] : [`${item.marker ?? ''}${item.seriesName}: ${formatIsk(value)}`];
      });
      if (day !== undefined) {
        rows.push(`Units: ${formatNumber(day.volume)} · Orders: ${formatNumber(day.orderCount)}`);
      }
      return rows;
    }),
    xAxis: categoryAxis(shown, colors),
    yAxis: valueAxis(colors, formatIsk, { min: 0 }),
    series: [
      bars('Daily ISK', shown.map(day => day.iskVolume), colors.bars),
      line('30-day median ISK', median30.slice(-count), colors.reference, 1.5),
      line('7-day median ISK', median7.slice(-count), colors.accent, 2),
    ],
  };
}

export function rangeChartOption(
  days: MarketHistoryDay[],
  span: ChartSpan,
  colors: ChartColors,
): EChartsOption {
  const rangePercent = (day: MarketHistoryDay) => (
    day.rangeRatio == null ? null : day.rangeRatio * 100
  );
  const median7 = rollingMedian(days, rangePercent, 7);
  const median30 = rollingMedian(days, rangePercent, 30);
  const shown = visibleDays(days, span);
  const count = shown.length;
  return {
    ...frame(colors),
    legend: legend(colors, ['Daily range', '7-day median range', '30-day median range']),
    tooltip: axisTooltip(colors, (items) => items.flatMap(item => {
      const value = numeric(item.value);
      return value === null
        ? []
        : [`${item.marker ?? ''}${item.seriesName}: ${formatPercentPoints(value)}`];
    })),
    xAxis: categoryAxis(shown, colors),
    yAxis: valueAxis(colors, value => formatPercentPoints(value, 0), { min: 0 }),
    series: [
      bars('Daily range', shown.map(rangePercent), colors.bars),
      line('30-day median range', median30.slice(-count), colors.reference, 2.5),
      line('7-day median range', median7.slice(-count), colors.accent, 2),
    ],
  };
}

function visibleDays(days: MarketHistoryDay[], span: ChartSpan): MarketHistoryDay[] {
  if (span === 'full' || days.length === 0) {
    return days;
  }
  const end = days[days.length - 1].time;
  const start = span === '90d'
    ? addDays(end, -89)
    : span === '6m'
      ? subMonths(end, 6)
      : subYears(end, 1);
  const startKey = format(start, 'yyyy-MM-dd');
  const shown = days.filter(day => day.date >= startKey);
  return shown.length === 0 ? days : shown;
}

function frame(colors: ChartColors): EChartsOption {
  return {
    // Legend show/hide replays the series entrance animation unless this is off.
    animation: false,
    textStyle: { fontFamily: colors.fontFamily, color: colors.muted },
    grid: { left: 64, right: 24, top: 36, bottom: 28 },
  };
}

function categoryAxis(days: MarketHistoryDay[], colors: ChartColors) {
  return {
    type: 'category' as const,
    data: days.map(day => format(day.time, 'dd-MM-yyyy')),
    axisLabel: { hideOverlap: true, color: colors.muted },
    axisLine: { lineStyle: { color: colors.divider } },
    axisTick: { show: false },
  };
}

function valueAxis(
  colors: ChartColors,
  formatter: (value: number) => string,
  extra: { min?: number; scale?: boolean },
) {
  return {
    type: 'value' as const,
    min: extra.min,
    scale: extra.scale,
    axisLabel: { formatter, color: colors.muted },
    splitLine: { lineStyle: { color: colors.divider, opacity: 0.6 } },
  };
}

function legend(colors: ChartColors, data: string[], selected?: Record<string, boolean>) {
  return {
    top: 0,
    left: 'center' as const,
    data,
    selected,
    itemWidth: 14,
    itemHeight: 8,
    itemGap: 12,
    textStyle: { color: colors.text, fontSize: 11 },
  };
}

function axisTooltip(colors: ChartColors, rows: (items: TooltipItem[]) => string[]) {
  return {
    trigger: 'axis' as const,
    axisPointer: { type: 'line' as const, lineStyle: { color: colors.muted } },
    backgroundColor: colors.paper,
    borderColor: colors.divider,
    textStyle: { color: colors.text, fontSize: 12 },
    formatter: (params: unknown) => {
      const items = (Array.isArray(params) ? params : [params]) as TooltipItem[];
      return [items[0]?.axisValueLabel ?? '', ...rows(items)].join('<br/>');
    },
  };
}

function numeric(value: TooltipItem['value']): number | null {
  return typeof value === 'number' && !Number.isNaN(value) ? value : null;
}

function line(
  name: string,
  data: (number | null)[],
  color: string,
  width: number,
  extra: { dashed?: boolean } = {},
): LineSeriesOption {
  return {
    name,
    type: 'line',
    animation: false,
    data,
    connectNulls: false,
    showSymbol: false,
    itemStyle: { color },
    lineStyle: { width, color, type: extra.dashed ? 'dashed' : 'solid' },
    emphasis: { disabled: true },
  };
}

function bars(name: string, data: (number | null)[], color: string): BarSeriesOption {
  return {
    name,
    type: 'bar',
    animation: false,
    data,
    barCategoryGap: '20%',
    itemStyle: { color, borderRadius: [2, 2, 0, 0] },
    emphasis: { disabled: true },
  };
}

function bandBase(data: (number | null)[]): LineSeriesOption {
  return {
    name: `${BAND}-base`,
    type: 'line',
    animation: false,
    data,
    stack: 'range',
    connectNulls: false,
    showSymbol: false,
    silent: true,
    lineStyle: { width: 0 },
    itemStyle: { color: 'transparent' },
    emphasis: { disabled: true },
    tooltip: { show: false },
  };
}

function bandSpan(name: string, data: (number | null)[], color: string): LineSeriesOption {
  return {
    name,
    type: 'line',
    animation: false,
    data,
    stack: 'range',
    connectNulls: false,
    showSymbol: false,
    silent: true,
    lineStyle: { width: 0 },
    areaStyle: { color, opacity: 1 },
    itemStyle: { color },
    emphasis: { disabled: true },
    tooltip: { show: false },
  };
}
