/*
 * Syncs regional market history from ESI into esi_market_history_daily,
 * then rewrites derived_market_history_summary for the types just fetched.
 *
 * Examples:
 *   npm run sync-market-history -- --type-ids 34,44992
 *   npm run sync-market-history -- --candidates
 *   npm run sync-market-history -- --region 10000002
 */
import 'reflect-metadata';
import 'dotenv/config';

import Container from 'typedi';
import { Sequelize } from 'sequelize';
import { initDatabase } from '../loaders/initDatabase';
import EveSdeData from '../core/sde/EveSdeData';
import { THE_FORGE } from '../const/IDs';
import { MarketHistoryIngestProgress } from '../features/market_history/MarketHistoryIngestService';
import MarketHistorySyncService from '../features/market_history/MarketHistorySyncService';
import { writeProgress } from '../lib/progress';
import { genxRunJob } from '../core/job/runJob';
import MarketHistorySummaryService, {
  CANDIDATE_MIN_DAYS_TRADED,
  CANDIDATE_MIN_MEDIAN_DAILY_ISK,
  CANDIDATE_WINDOW_DAYS,
} from '../features/market_history/MarketHistorySummaryService';

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

type Cli = { regionId: number; typeIds: number[] | null; candidates: boolean };

function parseArgs(argv: string[]): Cli {
  let regionId = THE_FORGE;
  let typeIds: number[] | null = null;
  let candidates = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--region':
        regionId = parsePositiveInt(argv[++i] ?? '', '--region');
        break;
      case '--type-ids':
        typeIds = parseIdList(argv[++i] ?? '', '--type-ids');
        break;
      case '--candidates':
        candidates = true;
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

  if (candidates && typeIds !== null) {
    throw new Error('--candidates and --type-ids cannot be combined');
  }
  return { regionId, typeIds, candidates };
}

function jobName(cli: Cli): string {
  if (cli.candidates) {
    return 'market_history_candidates';
  }
  return cli.typeIds === null ? 'market_history_all' : 'market_history_types';
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
  writeProgress(`\r${line}`);
}

function printHelp(): void {
  console.log(`
Usage: npm run sync-market-history -- [options]

Options:
  --region <id>           Region id (default: ${THE_FORGE} / The Forge)
  --type-ids <id,...>     Fetch only these type ids (default: all tradeable types)
  --candidates            Fetch only candidate types (from the 30-day summaries)

History is fetched from public ESI (no login required).
`);
}

async function run(): Promise<void> {
  console.log('Starting market history ingestion...');
  const cli = parseArgs(process.argv.slice(2));

  initDatabase();
  const sequelize = Container.get(Sequelize);
  await sequelize.authenticate();

  try {
    await genxRunJob(jobName(cli), () => genxSync(cli));
  } finally {
    await sequelize.close();
  }
}

async function genxSync(cli: Cli) {
  const sdeData = await EveSdeData.init();
  Container.set(EveSdeData, sdeData);

  let typeIds = cli.typeIds;
  if (cli.candidates) {
    typeIds = await Container.get(MarketHistorySummaryService).genCandidateTypeIds(
      cli.regionId,
      CANDIDATE_WINDOW_DAYS,
      CANDIDATE_MIN_DAYS_TRADED,
      CANDIDATE_MIN_MEDIAN_DAILY_ISK,
    );
    if (typeIds.length === 0) {
      throw new Error('No candidate types. Run the full sync first to build summaries.');
    }
  }

  const syncService = Container.get(MarketHistorySyncService);
  const resolvedTypeIds = syncService.resolveTypeIds(typeIds);

  console.log(`Region: ${cli.regionId}`);
  const typeLabel = cli.candidates ? 'candidates' : cli.typeIds?.join(',') ?? 'all tradeable';
  console.log(`Type ids: ${typeLabel}`);
  console.log(`Types to fetch: ${resolvedTypeIds.length}`);

  let lastProgress: MarketHistoryIngestProgress | null = null;
  const result = await syncService.genSync(
    resolvedTypeIds,
    cli.regionId,
    (progress) => {
      lastProgress = progress;
      printIngestProgress(progress);
    },
    (completed, total) => {
      if (completed === 0) {
        writeProgress('\n');
        console.log('Writing market history summaries...');
      }
      writeProgress(`\rSummaries ${completed}/${total} types`);
    },
  );
  if (resolvedTypeIds.length === 0) {
    writeProgress('\n');
    console.log('Writing market history summaries...');
  }
  writeProgress('\n');
  console.log(`Summary rows written: ${result.summaryRowsWritten}`);
  console.log('Done.');
  console.log(JSON.stringify(result.ingest, null, 2));

  const { ingest } = result;
  const progress = lastProgress as MarketHistoryIngestProgress | null;
  return {
    regionId: ingest.regionId,
    typeCount: ingest.typeCount,
    typesSucceeded: ingest.typesSucceeded,
    typesFailed: ingest.typesFailed,
    requests: progress?.completedRequests ?? 0,
    mbFetched: Number(((progress?.bytesFetched ?? 0) / (1024 * 1024)).toFixed(1)),
    rowsUpserted: ingest.rowsUpserted,
    summaryRowsWritten: result.summaryRowsWritten,
    failedTypeIds: ingest.failedTypeIds,
    errors: ingest.errors.slice(0, 10),
  };
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
