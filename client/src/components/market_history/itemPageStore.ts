import { atom } from 'recoil';
import { MarketHistoryRes } from '@internal/shared';
import { ChartSpan } from './historyChartOptions';

export type ItemTab = 'trade' | 'activity' | 'history';

export const ITEM_TABS: readonly ItemTab[] = ['trade', 'activity', 'history'];

/** Kept across page switches so the Item page reopens on the same item without refetching. */
export const itemPageAtom = atom<{
  typeId: number | null;
  tab: ItemTab;
  span: ChartSpan;
  history: { typeId: number; data: MarketHistoryRes } | null;
}>({
  key: 'itemPage',
  default: { typeId: null, tab: 'trade', span: '90d', history: null },
});
