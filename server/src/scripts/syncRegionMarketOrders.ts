/*
 * Fetches The Forge order book and the Perimeter structure books, keeps Jita and
 * the structures, diffs them against the stored open orders, and records events
 * (30 days), closes with evidence (1 year), and the daily trade rollup. A failed
 * page writes nothing.
 *
 *   npm run sync-region-market-orders
 */
import 'reflect-metadata';
import 'dotenv/config';

import Container from 'typedi';
import { Sequelize } from 'sequelize';
import { initDatabase } from '../loaders/initDatabase';
import MarketOrderBookService, {
  RegionOrderBookProgress,
} from '../features/market_order_book/MarketOrderBookService';
import { genxRunJob, JobFailure } from '../core/job/runJob';
import { writeProgress } from '../lib/progress';

function parseArgs(argv: string[]): void {
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
}

function formatDuration(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function printProgress(progress: RegionOrderBookProgress): void {
  const pct = ((progress.completedPages / progress.totalPages) * 100).toFixed(1);
  const line =
    `${progress.completedPages}/${progress.totalPages} pages (${pct}%) | ` +
    `${progress.orders} orders | ` +
    formatDuration(progress.elapsedMs);
  writeProgress(`\r${line}`);
}

function printHelp(): void {
  console.log(`
Usage: npm run sync-region-market-orders

Fetches the Jita and Perimeter order books and adds the day's traded volume to the rollup.
`);
}

async function run(): Promise<void> {
  parseArgs(process.argv.slice(2));
  initDatabase();
  const sequelize = Container.get(Sequelize);
  await sequelize.authenticate();

  try {
    await genxRunJob('region_order_book', () => genxSync());
  } finally {
    await sequelize.close();
  }
}

async function genxSync() {
  console.log('Syncing Jita and Perimeter order books');
  const startedAt = Date.now();
  let pages = 0;
  const result = await Container.get(MarketOrderBookService).genxSyncRegionOrderBook(
    (progress) => {
      if (progress.completedPages === progress.totalPages) {
        pages += progress.totalPages;
      }
      printProgress(progress);
    },
  );
  writeProgress('\n');
  console.log(`Fetched orders: ${result.fetchedOrders}, kept in Jita: ${result.keptOrders}`);
  for (const structure of result.structureFetches) {
    if (structure.error === null) {
      console.log(
        `Structure ${structure.locationId} fetched ${structure.fetchedOrders} ` +
        `inserted ${structure.openOrdersInserted} ` +
        `updated ${structure.openOrdersUpdated} ` +
        `deleted ${structure.openOrdersDeleted} ` +
        `appeared ${structure.eventCounts.appeared} ` +
        `traded ${structure.eventCounts.traded} ` +
        `repriced ${structure.eventCounts.repriced} ` +
        `expired ${structure.eventCounts.expired} ` +
        `ambiguous ${structure.eventCounts.ambiguous}`,
      );
    } else {
      console.log(`Structure ${structure.locationId} fetch failed: ${structure.error}`);
    }
  }
  console.log(`Daily rollup rows written: ${result.dailyRowsWritten}`);
  console.log(
    `Open orders inserted ${result.openOrdersInserted} ` +
    `updated ${result.openOrdersUpdated} ` +
    `deleted ${result.openOrdersDeleted}`,
  );
  console.log(
    `appeared ${result.eventCounts.appeared} ` +
    `traded ${result.eventCounts.traded} ` +
    `repriced ${result.eventCounts.repriced} ` +
    `expired ${result.eventCounts.expired} ` +
    `ambiguous ${result.eventCounts.ambiguous}`,
  );
  console.log(`Observed at: ${result.observedAt}`);
  console.log(`Elapsed: ${formatDuration(Date.now() - startedAt)}`);

  const summary = {
    regionId: result.regionId,
    pages,
    fetchedOrders: result.fetchedOrders,
    keptOrders: result.keptOrders,
    snapshotAt: result.snapshotAt,
    mixedSnapshots: result.mixedSnapshots,
    dailyRowsWritten: result.dailyRowsWritten,
    eventsWritten: result.eventsWritten,
    closesOpened: result.closesOpened,
    closesReappeared: result.closesReappeared,
    eventsPruned: result.eventsPruned,
    closesPruned: result.closesPruned,
    openOrdersInserted: result.openOrdersInserted,
    openOrdersUpdated: result.openOrdersUpdated,
    openOrdersDeleted: result.openOrdersDeleted,
    eventCounts: result.eventCounts,
    structures: result.structureFetches.map((structure) => ({
      locationId: structure.locationId,
      fetchedOrders: structure.fetchedOrders,
      error: structure.error,
    })),
  };
  const structureFailure = result.structureFetches.find((structure) => structure.error !== null);
  if (structureFailure !== undefined) {
    throw new JobFailure(`Structure ${structureFailure.locationId} fetch failed`, summary);
  }
  return summary;
}

run().catch((error: unknown) => {
  writeProgress('\n');
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Aborted. ${message}`);
  process.exit(1);
});
