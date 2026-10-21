/*
 * Fetches the public regional order book, diffs it against the stored open
 * orders, and writes events plus the next open book. A failed page writes nothing.
 *
 * Examples:
 *   npm run sync-region-market-orders
 *   npm run sync-region-market-orders -- --region 10000002
 */
import 'reflect-metadata';
import 'dotenv/config';

import Container from 'typedi';
import { Sequelize } from 'sequelize';
import { THE_FORGE } from '../const/IDs';
import { initDatabase } from '../loaders/initDatabase';
import MarketOrderBookService, {
  RegionOrderBookProgress,
} from '../features/market_order_book/MarketOrderBookService';

function parsePositiveInt(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return parsed;
}

function parseArgs(argv: string[]): { regionId: number } {
  let regionId = THE_FORGE;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--region':
        regionId = parsePositiveInt(argv[++i] ?? '', '--region');
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { regionId };
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
  process.stdout.write(`\r${line}`);
}

function printHelp(): void {
  console.log(`
Usage: npm run sync-region-market-orders -- [options]

Options:
  --region <id>    Region id (default: ${THE_FORGE} / The Forge)

Fetches the public order book and stores the diff.
`);
}

async function run(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2));
  initDatabase();
  const sequelize = Container.get(Sequelize);
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });

  console.log(`Syncing public order book for region ${cli.regionId}`);
  const startedAt = Date.now();
  const result = await Container.get(MarketOrderBookService).genxSyncRegionOrderBook(
    cli.regionId,
    printProgress,
  );
  process.stdout.write('\n');
  console.log(`Fetched orders: ${result.fetchedOrders}`);
  console.log(`Events written: ${result.eventsWritten}`);
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

  await sequelize.close();
}

run().catch((error: unknown) => {
  process.stdout.write('\n');
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Aborted. ${message}`);
  process.exit(1);
});
