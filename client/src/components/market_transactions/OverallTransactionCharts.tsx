import { useMemo } from "react";
import { FeesAndTaxesRes, WalletTransactionsRes } from "@internal/shared";
import { Box, CircularProgress, Typography, useTheme } from "@mui/material";
import type { EChartsCoreOption } from "echarts/core";
import useAxios from "axios-hooks";
import { eachDayOfInterval, format, isAfter, isBefore } from "date-fns";
import { sum } from "mathjs";
import { groupBy } from "underscore";
import { formatIsk } from "common/format";
import EChart from "components/util/EChart";
import ChartPanel from "./ChartPanel";
import { useMarketTransactionsStore } from "./marketTransactionsStore";

// Same plot box on both charts so a date sits at the same horizontal position.
const GRID = { left: 72, right: 16, top: 36, bottom: 28 };

export default function OverallTransactionCharts(props: {
  data: WalletTransactionsRes,
}) {
  const theme = useTheme();
  const { startDate, endDate } = useMarketTransactionsStore();
  const [{ data: feesData, loading: feesLoading }] = useAxios<FeesAndTaxesRes>('/fees_and_taxes');

  const salesByDay = useMemo(() => {
    const sells = props.data.filter(transaction => !transaction.isBuy);
    return sumByDay(sells, transaction => transaction.quantity * transaction.unitPrice);
  }, [props.data]);

  const feesByDay = useMemo(() => {
    const filtered = (feesData ?? []).filter(entry =>
      isBefore(new Date(entry.date), endDate)
      && isAfter(new Date(entry.date), startDate)
    );
    return {
      brokerFees: sumByDay(
        filtered.filter(entry => entry.type === 'brokers_fee'),
        entry => entry.amount,
      ),
      transactionTaxes: sumByDay(
        filtered.filter(entry => entry.type === 'transaction_tax'),
        entry => entry.amount,
      ),
    };
  }, [feesData, startDate, endDate]);

  const dates = useMemo(() => sharedDayKeys([
    ...mapKeys(salesByDay),
    ...mapKeys(feesByDay.brokerFees),
    ...mapKeys(feesByDay.transactionTaxes),
  ]), [salesByDay, feesByDay]);

  const salesOption = useMemo(() => barOption(theme, dates, [{
    name: 'Sales',
    color: theme.palette.success.main,
    data: dates.map(date => salesByDay.get(date) ?? null),
  }], { min: 0 }), [theme, dates, salesByDay]);

  const feesOption = useMemo(() => {
    const brokerFees = dates.map(date => feesByDay.brokerFees.get(date) ?? null);
    const transactionTaxes = dates.map(date => feesByDay.transactionTaxes.get(date) ?? null);
    return barOption(theme, dates, [
      {
        name: 'Broker Fees',
        color: theme.palette.error.main,
        data: brokerFees.map((value, index) => (
          value == null && transactionTaxes[index] == null ? null : value ?? 0
        )),
        stack: 'fees',
      },
      {
        name: 'Transaction Tax',
        color: theme.palette.warning.main,
        data: transactionTaxes.map((value, index) => (
          value == null && brokerFees[index] == null ? null : value ?? 0
        )),
        stack: 'fees',
      },
    ]);
  }, [theme, dates, feesByDay]);

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'stretch', minWidth: 0 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <ChartPanel title="Sales">
          <ChartBody option={dates.length === 0 ? null : salesOption} empty="No sales in this date range." />
        </ChartPanel>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <ChartPanel title="Fees and taxes">
          {feesLoading && feesData == null ? (
            <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : (
            <ChartBody option={dates.length === 0 ? null : feesOption} empty="No fees or taxes in this date range." />
          )}
        </ChartPanel>
      </Box>
    </Box>
  );
}

function ChartBody(props: { option: EChartsCoreOption | null; empty: string }) {
  if (props.option == null) {
    return (
      <Box sx={{ height: 300, display: 'flex', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {props.empty}
        </Typography>
      </Box>
    );
  }
  return <EChart option={props.option} height={300} />;
}

function sumByDay<T extends { date: string }>(
  rows: T[],
  amount: (row: T) => number,
): Map<string, number> {
  const grouped = groupBy(rows, row => format(new Date(row.date), 'yyyy-MM-dd'));
  return new Map(Object.entries(grouped).map(([date, group]) => [
    date,
    Number(sum(group.map(amount))),
  ]));
}

function mapKeys(values: Map<string, number>): string[] {
  const keys: string[] = [];
  values.forEach((_, key) => keys.push(key));
  return keys;
}

/** Every calendar day from the earliest datapoint to the latest, shared by both charts. */
function sharedDayKeys(keys: string[]): string[] {
  let min: string | null = null;
  let max: string | null = null;
  for (const key of keys) {
    if (min == null || key < min) {
      min = key;
    }
    if (max == null || key > max) {
      max = key;
    }
  }
  if (min == null || max == null) {
    return [];
  }
  return eachDayOfInterval({ start: localDay(min), end: localDay(max) })
    .map(day => format(day, 'yyyy-MM-dd'));
}

function localDay(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

type BarSeries = {
  name: string;
  color: string;
  data: (number | null)[];
  stack?: string;
};

function barOption(
  theme: { palette: { text: { primary: string; secondary: string }; divider: string; background: { paper: string } }; typography: { fontFamily?: string } },
  dates: string[],
  series: BarSeries[],
  yAxis?: { min?: number },
): EChartsCoreOption {
  const text = theme.palette.text.primary;
  const muted = theme.palette.text.secondary;
  const divider = theme.palette.divider;
  return {
    animation: false,
    textStyle: { fontFamily: theme.typography.fontFamily ?? 'sans-serif', color: muted },
    grid: GRID,
    legend: {
      top: 0,
      left: 'center',
      data: series.map(item => item.name),
      itemWidth: 14,
      itemHeight: 8,
      itemGap: 8,
      textStyle: { color: text, fontSize: 11 },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: theme.palette.background.paper,
      borderColor: divider,
      textStyle: { color: text, fontSize: 12 },
      formatter: (params: unknown) => barTooltip(params),
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { hideOverlap: true, color: muted },
      axisLine: { lineStyle: { color: divider } },
      axisTick: { lineStyle: { color: divider } },
    },
    yAxis: {
      type: 'value',
      min: yAxis?.min,
      axisLabel: {
        color: muted,
        formatter: (value: number) => formatIsk(value),
      },
      splitLine: { lineStyle: { color: divider } },
    },
    series: series.map(item => ({
      type: 'bar' as const,
      name: item.name,
      stack: item.stack,
      animation: false,
      data: item.data,
      itemStyle: { color: item.color },
    })),
  };
}

function barTooltip(params: unknown): string {
  const items = (Array.isArray(params) ? params : [params]) as {
    seriesName?: string;
    marker?: string;
    value?: number | string | null;
    axisValueLabel?: string;
  }[];
  const rows = items.flatMap(item => {
    const value = typeof item.value === 'number' ? item.value : Number(item.value);
    if (item.seriesName == null || !Number.isFinite(value)) {
      return [];
    }
    return [`${item.marker ?? ''}${item.seriesName}: ${formatIsk(value)}`];
  });
  return [items[0]?.axisValueLabel ?? '', ...rows].join('<br/>');
}
