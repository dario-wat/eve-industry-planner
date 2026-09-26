import { addDays, format, subMonths, subYears } from 'date-fns';
import type { ComposeOption } from 'echarts/core';
import type { LineSeriesOption } from 'echarts/charts';
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

export type EChartsOption = ComposeOption<
  | LineSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
>;

export type ChartColors = {
  band: string;
  edge: string;
  average: string;
  median7: string;
  median30: string;
  orders7: string;
  orders30: string;
  text: string;
  muted: string;
  divider: string;
  paper: string;
  fontFamily: string;
};

const BAND = 'band';

type TooltipItem = {
  seriesName?: string;
  marker?: string;
  value?: number | string | null;
  axisValueLabel?: string;
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
    ...frame(colors, { right: 24 }),
    legend: legend(colors, ['Average', '7-day median', '30-day median', 'High', 'Low']),
    tooltip: axisTooltip(colors, value => formatIsk(value)),
    xAxis: categoryAxis(shown, colors),
    yAxis: valueAxis(colors, formatIsk, { scale: true }),
    series: [
      bandBase(shown.map(day => day.low)),
      bandSpan(shown.map(day => day.rangeWidth), colors.band),
      priceLine('Low', shown.map(day => day.low), colors.edge, 1),
      priceLine('High', shown.map(day => day.high), colors.edge, 1),
      priceLine('30-day median', median30.slice(-count), colors.median30, 1.5),
      priceLine('7-day median', median7.slice(-count), colors.median7, 1.5),
      priceLine('Average', shown.map(day => day.average), colors.average, 2),
    ],
  };
}

export function liquidityChartOption(
  days: MarketHistoryDay[],
  span: ChartSpan,
  colors: ChartColors,
): EChartsOption {
  const iskMedian7 = rollingMedian(days, day => day.iskVolume, 7);
  const iskMedian30 = rollingMedian(days, day => day.iskVolume, 30);
  const orderMedian7 = rollingMedian(days, day => day.orderCount, 7);
  const orderMedian30 = rollingMedian(days, day => day.orderCount, 30);
  const shown = visibleDays(days, span);
  const count = shown.length;
  return {
    ...frame(colors, { right: 56 }),
    legend: legend(colors, ['7-day ISK', '30-day ISK', '7-day orders', '30-day orders']),
    tooltip: axisTooltip(colors, (value, seriesName) => (
      seriesName.endsWith('orders') ? formatCount(value) : formatIsk(value)
    )),
    xAxis: categoryAxis(shown, colors),
    yAxis: [
      valueAxis(colors, formatIsk, { min: 0 }),
      valueAxis(colors, formatCount, { min: 0, splitLine: false }),
    ],
    series: [
      medianLine('30-day ISK', iskMedian30.slice(-count), colors.median30, 0, 'solid'),
      medianLine('7-day ISK', iskMedian7.slice(-count), colors.median7, 0, 'solid'),
      medianLine('30-day orders', orderMedian30.slice(-count), colors.orders30, 1, 'dashed'),
      medianLine('7-day orders', orderMedian7.slice(-count), colors.orders7, 1, 'dashed'),
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
  const daily = days.map(rangePercent);
  const median7 = rollingMedian(days, rangePercent, 7);
  const median30 = rollingMedian(days, rangePercent, 30);
  const shown = visibleDays(days, span);
  const count = shown.length;
  return {
    ...frame(colors, { right: 24 }),
    legend: legend(colors, ['Daily range', '7-day median', '30-day median']),
    tooltip: axisTooltip(colors, value => formatPercentPoints(value)),
    xAxis: categoryAxis(shown, colors),
    yAxis: valueAxis(colors, value => formatPercentPoints(value, 0), { min: 0 }),
    series: [
      priceLine('Daily range', daily.slice(-count), colors.edge, 1),
      priceLine('30-day median', median30.slice(-count), colors.median30, 1.5),
      priceLine('7-day median', median7.slice(-count), colors.median7, 1.5),
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

function frame(colors: ChartColors, margin: { right: number }): EChartsOption {
  return {
    // Legend show/hide replays the series entrance animation unless this is off.
    animation: false,
    textStyle: { fontFamily: colors.fontFamily, color: colors.muted },
    grid: { left: 64, right: margin.right, top: 36, bottom: 28 },
  };
}

function categoryAxis(days: MarketHistoryDay[], colors: ChartColors) {
  return {
    type: 'category' as const,
    data: days.map(day => format(day.time, 'dd-MM-yyyy')),
    axisLabel: { hideOverlap: true, color: colors.muted },
    axisLine: { lineStyle: { color: colors.divider } },
    axisTick: { lineStyle: { color: colors.divider } },
  };
}

function valueAxis(
  colors: ChartColors,
  formatter: (value: number) => string,
  extra: { min?: number; scale?: boolean; splitLine?: boolean },
) {
  return {
    type: 'value' as const,
    min: extra.min,
    scale: extra.scale,
    axisLabel: { formatter, color: colors.muted },
    splitLine: {
      show: extra.splitLine !== false,
      lineStyle: { color: colors.divider },
    },
  };
}

function legend(colors: ChartColors, data: string[]) {
  return {
    top: 0,
    left: 'center' as const,
    data,
    itemWidth: 14,
    itemHeight: 8,
    itemGap: 8,
    textStyle: { color: colors.text, fontSize: 11 },
  };
}

function axisTooltip(
  colors: ChartColors,
  formatValue: (value: number, seriesName: string) => string,
) {
  return {
    trigger: 'axis' as const,
    backgroundColor: colors.paper,
    borderColor: colors.divider,
    textStyle: { color: colors.text, fontSize: 12 },
    formatter: (params: unknown) => tooltipHtml(params, formatValue),
  };
}

function tooltipHtml(
  params: unknown,
  formatValue: (value: number, seriesName: string) => string,
): string {
  const items = (Array.isArray(params) ? params : [params]) as TooltipItem[];
  const rows = items.flatMap(item => {
    const value = typeof item.value === 'number' ? item.value : null;
    if (item.seriesName == null || item.seriesName.startsWith(BAND) || value == null) {
      return [];
    }
    return [`${item.marker ?? ''}${item.seriesName}: ${formatValue(value, item.seriesName)}`];
  });
  const header = items[0]?.axisValueLabel ?? '';
  return [header, ...rows].join('<br/>');
}

function formatCount(value: number): string {
  return formatNumber(value, Number.isInteger(value) ? 0 : 1);
}

function medianLine(
  name: string,
  data: (number | null)[],
  color: string,
  yAxisIndex: number,
  lineType: 'solid' | 'dashed',
): LineSeriesOption {
  return {
    ...priceLine(name, data, color, 1.5),
    yAxisIndex,
    lineStyle: { width: 1.5, color, type: lineType },
  };
}

function priceLine(
  name: string,
  data: (number | null)[],
  color: string,
  width: number,
): LineSeriesOption {
  return {
    name,
    type: 'line',
    animation: false,
    data,
    connectNulls: false,
    showSymbol: false,
    itemStyle: { color },
    lineStyle: { width, color },
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

function bandSpan(data: (number | null)[], color: string): LineSeriesOption {
  return {
    name: `${BAND}-span`,
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
