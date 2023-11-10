import { MarketHistoryRes } from '@internal/shared';
import { formatNumber, formatNumberScale } from 'components/util/numbers';
import { mean } from 'mathjs';

export function createHeuristic(
  history: MarketHistoryRes,
): { name: string, value: string, value_3_days: string }[] {
  const recentHistory = history.slice(-3);
  return [
    {
      name: 'Avg Volume',
      value: formatNumber(mean(history.map(h => h.volume))),
      value_3_days: formatNumber(mean(recentHistory.map(h => h.volume))),
    },
    {
      name: 'Avg ISK Volume',
      value: formatNumberScale(mean(history.map(h => h.volume * h.average))),
      value_3_days: formatNumberScale(
        mean(recentHistory.map(h => h.volume * h.average))
      ),
    },
    {
      name: 'Avg Price',
      value: formatNumber(mean(history.map(h => h.average))),
      value_3_days: formatNumber(mean(recentHistory.map(h => h.average))),
    },
    {
      name: 'Avg Price DIff',
      value: formatNumber(mean(history.map(h => h.highest - h.lowest))),
      value_3_days: formatNumber(
        mean(recentHistory.map(h => h.highest - h.lowest))
      ),
    },
    {
      name: 'Avg Gain Perc',
      value: formatNumber(
        mean(history.map(h => 100 * (h.highest - h.lowest) / h.highest)),
        2,
      ),
      value_3_days: formatNumber(
        mean(recentHistory.map(h => 100 * (h.highest - h.lowest) / h.highest)),
        2,
      ),
    },
  ];
}
