/*
 * Fetches The Forge public order book, diffs it against the stored open
 * orders, and writes the changes. recordRun stores the outcome.
 */
import 'reflect-metadata';
import Container from 'typedi';
import { Sequelize } from 'sequelize';
import { THE_FORGE } from '../const/IDs';
import { initDatabase } from '../loaders/initDatabase';
import MarketOrderBookService, {
  RegionOrderBookProgress,
} from '../features/market_order_book/MarketOrderBookService';
import { recordRun } from './recordRun';

let ready: Promise<void> | null = null;

function ensureReady(): Promise<void> {
  if (ready !== null) {
    return ready;
  }

  ready = initPool().catch((error: unknown) => {
    ready = null;
    throw error;
  });
  return ready;
}

async function initPool(): Promise<void> {
  initDatabase();
  await Container.get(Sequelize).authenticate();
}

function logFetch(progress: RegionOrderBookProgress): void {
  if (
    progress.completedPages !== 1
    && progress.completedPages % 100 !== 0
    && progress.completedPages !== progress.totalPages
  ) {
    return;
  }
  console.log(
    `${progress.completedPages}/${progress.totalPages} pages | ${progress.orders} orders`,
  );
}

export const handler = recordRun(async () => {
  await ensureReady();

  const regionId = THE_FORGE;
  console.log(`Syncing public order book for region ${regionId}`);
  const result = await Container.get(MarketOrderBookService).genxSyncRegionOrderBook(
    regionId,
    logFetch,
  );
  console.log(
    `Fetched ${result.fetchedOrders} ` +
    `events ${result.eventsWritten} ` +
    `inserted ${result.openOrdersInserted} ` +
    `updated ${result.openOrdersUpdated} ` +
    `deleted ${result.openOrdersDeleted}`,
  );
  return result;
});
