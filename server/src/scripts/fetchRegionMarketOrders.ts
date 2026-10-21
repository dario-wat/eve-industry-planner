/*
 * Fetches the public regional order book from ESI and prints timing.
 * Nothing is stored. A failed page aborts the pull.
 *
 * Examples:
 *   npm run fetch-region-market-orders
 *   npm run fetch-region-market-orders -- --region 10000002
 */
import 'reflect-metadata';
import 'dotenv/config';

import Container from 'typedi';
import { THE_FORGE } from '../const/IDs';
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
Usage: npm run fetch-region-market-orders -- [options]

Options:
  --region <id>    Region id (default: ${THE_FORGE} / The Forge)

Fetches the public order book and discards it. Nothing is written.
`);
}

async function run(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2));
  console.log(`Fetching public order book for region ${cli.regionId}`);
  console.log('Nothing will be stored.');

  const startedAt = Date.now();
  const orders = await Container.get(MarketOrderBookService).genxRegionOrderBook(
    cli.regionId,
    printProgress,
  );
  const elapsedMs = Date.now() - startedAt;
  process.stdout.write('\n');
  console.log(`Pages completed. Orders: ${orders.length}`);
  console.log(`Elapsed: ${formatDuration(elapsedMs)} (${elapsedMs} ms)`);
  console.log('Discarded. Nothing was stored.');
}

run().catch((error: unknown) => {
  process.stdout.write('\n');
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Aborted. ${message}`);
  process.exit(1);
});
