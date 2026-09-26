import { useEffect, useRef } from 'react';
import { ECharts, init, use } from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsOption } from './historyChartOptions';

use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);

export default function EChart(props: {
  option: EChartsOption;
  height: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);
  const optionRef = useRef(props.option);
  optionRef.current = props.option;

  useEffect(() => {
    const host = hostRef.current;
    if (host == null) {
      return undefined;
    }
    const chart = init(host);
    chartRef.current = chart;
    chart.setOption(optionRef.current, { notMerge: true });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(host);
    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(props.option, { notMerge: true });
  }, [props.option]);

  return <div ref={hostRef} style={{ width: '100%', height: props.height }} />;
}
