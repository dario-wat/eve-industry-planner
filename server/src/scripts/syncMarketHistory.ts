/*
 * Syncs regional market history from ESI into market_history_daily.
 *
 * Examples:
 *   ts-node ./server/src/scripts/syncMarketHistory.ts --type-ids 34,44992
 *   ts-node ./server/src/scripts/syncMarketHistory.ts --region 10000002
 */
import 'reflect-metadata';
import 'dotenv/config';

import Container from 'typedi';
import { Sequelize } from 'sequelize';
import { initDatabase } from '../loaders/initDatabase';
import EveSdeData from '../core/sde/EveSdeData';
import { THE_FORGE } from '../const/IDs';
import MarketHistoryIngestService, {
  MarketHistoryIngestProgress,
} from '../features/market/MarketHistoryIngestService';

function parsePositiveInt(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return parsed;
}

function parseIdList(value: string, flag: string): number[] {
  const ids = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (ids.length === 0) {
    throw new Error(`${flag} requires at least one id`);
  }
  return ids.map((id) => parsePositiveInt(id, flag));
}

function parseArgs(argv: string[]): { regionId: number; typeIds: number[] | null } {
  let regionId = THE_FORGE;
  let typeIds: number[] | null = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--region':
        regionId = parsePositiveInt(argv[++i] ?? '', '--region');
        break;
      case '--type-ids':
        typeIds = parseIdList(argv[++i] ?? '', '--type-ids');
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

  return { regionId, typeIds };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
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

function printIngestProgress(progress: MarketHistoryIngestProgress): void {
  const { completedRequests, totalRequests } = progress;
  const pct =
    totalRequests === 0 ? '100.0' : ((completedRequests / totalRequests) * 100).toFixed(1);
  const line =
    `${completedRequests}/${totalRequests} requests (${pct}%) | ` +
    `ok ${progress.typesSucceeded} fail ${progress.typesFailed} | ` +
    `${formatBytes(progress.bytesFetched)} fetched | ` +
    `${progress.rowsUpserted} rows | ` +
    `${formatDuration(progress.elapsedMs)}`;
  process.stdout.write(`\r${line}`);
}

function printHelp(): void {
  console.log(`
Usage: ts-node ./server/src/scripts/syncMarketHistory.ts [options]

Options:
  --region <id>           Region id (default: ${THE_FORGE} / The Forge)
  --type-ids <id,...>     Fetch only these type ids (default: all tradeable types)

History is fetched from public ESI (no login required).
`);
}

async function run(): Promise<void> {
  console.log('Starting market history ingestion...');
  const cli = parseArgs(process.argv.slice(2));

  initDatabase();
  const sequelize = Container.get(Sequelize);
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });

  const sdeData = await EveSdeData.init();
  Container.set(EveSdeData, sdeData);

  const ingestService = Container.get(MarketHistoryIngestService);
  const resolvedTypeIds = ingestService.resolveTypeIds(cli.typeIds);

  console.log(`Region: ${cli.regionId}`);
  console.log(`Type ids: ${cli.typeIds === null ? 'all tradeable' : cli.typeIds.join(',')}`);
  console.log(`Types to fetch: ${resolvedTypeIds.length}`);

  const result = await ingestService.genIngest(cli.typeIds, cli.regionId, printIngestProgress);

  process.stdout.write('\n');
  console.log('Done.');
  console.log(JSON.stringify(result, null, 2));

  await sequelize.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
