import { useEffect, useRef } from 'react';
import { ECharts, EChartsCoreOption, init, use } from 'echarts/core';
import { BarChart, LineChart, ScatterChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

use([
  BarChart,
  LineChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);

export default function EChart(props: {
  option: EChartsCoreOption;
  height: number | '100%';
  onClick?: (data: unknown) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);
  const optionRef = useRef(props.option);
  const onClickRef = useRef(props.onClick);
  optionRef.current = props.option;
  onClickRef.current = props.onClick;

  useEffect(() => {
    const host = hostRef.current;
    if (host == null) {
      return undefined;
    }
    const chart = init(host);
    chartRef.current = chart;
    chart.setOption(optionRef.current, { notMerge: true });
    chart.on('click', (params) => {
      onClickRef.current?.((params as { data?: unknown }).data);
    });
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

  return (
    <div
      ref={hostRef}
      style={{
        width: '100%',
        height: props.height,
        flex: props.height === '100%' ? 1 : undefined,
        minHeight: props.height === '100%' ? 0 : undefined,
      }}
    />
  );
}
