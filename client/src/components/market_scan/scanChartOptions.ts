import type { ScatterSeriesOption } from 'echarts/charts';
import type { ComposeOption } from 'echarts/core';
import type { GridComponentOption, TooltipComponentOption } from 'echarts/components';
import { formatIsk, formatSignedPercent } from 'common/format';
import { ScatterPoint } from './marketHistoryScan';

export type ScanEChartsOption = ComposeOption<
  | ScatterSeriesOption
  | GridComponentOption
  | TooltipComponentOption
>;

export type ScanChartColors = {
  up: string;
  down: string;
  flat: string;
  text: string;
  muted: string;
  divider: string;
  paper: string;
  fontFamily: string;
};

type ScatterDatum = ScatterPoint & {
  value: [number, number];
  itemStyle: { color: string };
};

export function scatterChartOption(points: ScatterPoint[], colors: ScanChartColors): ScanEChartsOption {
  const data: ScatterDatum[] = [];
  for (const point of points) {
    data.push({
      ...point,
      value: [point.medianIsk, point.priceChange],
      itemStyle: { color: pointColor(point.priceChange, colors) },
    });
  }
  return {
    animation: false,
    textStyle: { fontFamily: colors.fontFamily, color: colors.muted },
    grid: { left: 108, right: 36, top: 20, bottom: 52 },
    tooltip: {
      trigger: 'item',
      backgroundColor: colors.paper,
      borderColor: colors.divider,
      textStyle: { color: colors.text, fontSize: 12 },
      formatter: (params: unknown) => scatterTooltip(params),
    },
    xAxis: {
      type: 'log',
      name: 'Median ISK/day',
      nameLocation: 'middle',
      nameGap: 32,
      nameTextStyle: { color: colors.muted },
      axisLabel: {
        margin: 8,
        formatter: (value: number) => formatIsk(value),
        color: colors.muted,
      },
      axisLine: { lineStyle: { color: colors.divider } },
      splitLine: { lineStyle: { color: colors.divider } },
    },
    yAxis: {
      type: 'value',
      name: 'Price change',
      nameLocation: 'middle',
      nameGap: 84,
      nameTextStyle: { color: colors.muted },
      scale: true,
      axisLabel: {
        margin: 8,
        formatter: (value: number) => formatSignedPercent(value),
        color: colors.muted,
      },
      axisLine: { lineStyle: { color: colors.divider } },
      splitLine: { lineStyle: { color: colors.divider } },
    },
    series: [
      {
        type: 'scatter',
        animation: false,
        cursor: 'pointer',
        data,
        symbolSize: 7,
        emphasis: { scale: 1.6 },
      },
    ],
  };
}

function pointColor(priceChange: number, colors: ScanChartColors): string {
  if (priceChange > 0) {
    return colors.up;
  }
  if (priceChange < 0) {
    return colors.down;
  }
  return colors.flat;
}

function scatterTooltip(params: unknown): string {
  const data = (Array.isArray(params) ? params[0] : params) as { data?: ScatterDatum } | undefined;
  const point = data?.data;
  if (point == null || point.name == null) {
    return '';
  }
  return [
    escapeHtml(point.name),
    `Median ISK/day: ${formatIsk(point.medianIsk)}`,
    `Price change: ${formatSignedPercent(point.priceChange)}`,
  ].join('<br/>');
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
