/*
 * Refetches regional market history for every tradeable type, then rewrites
 * their summaries. The Forge only. recordRun stores the outcome.
 */
import 'reflect-metadata';
import Container from 'typedi';
import { Sequelize } from 'sequelize';
import { THE_FORGE } from '../const/IDs';
import EveSdeData from '../core/sde/EveSdeData';
import { initDatabase } from '../loaders/initDatabase';
import { MarketHistoryIngestProgress } from '../features/market_history/MarketHistoryIngestService';
import MarketHistorySyncService from '../features/market_history/MarketHistorySyncService';
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
  const sdeData = await EveSdeData.init();
  Container.set(EveSdeData, sdeData);
}

function logIngest(progress: MarketHistoryIngestProgress): void {
  if (progress.completedRequests === 0) {
    return;
  }
  if (
    progress.completedRequests % 100 !== 0
    && progress.completedRequests !== progress.totalRequests
  ) {
    return;
  }
  console.log(
    `${progress.completedRequests}/${progress.totalRequests} `
    + `ok ${progress.typesSucceeded} fail ${progress.typesFailed}`,
  );
}

export const handler = recordRun(async () => {
  await ensureReady();

  const regionId = THE_FORGE;
  const syncService = Container.get(MarketHistorySyncService);
  const typeIds = syncService.resolveTypeIds(null);
  console.log(`Syncing market history for ${typeIds.length} tradeable types in region ${regionId}`);

  const synced = await syncService.genSync(
    null,
    regionId,
    logIngest,
    (completed, total) => {
      if (completed === 0 || (completed % 100 !== 0 && completed !== total)) {
        return;
      }
      console.log(`Summaries ${completed}/${total}`);
    },
  );

  return {
    regionId,
    typeCount: synced.ingest.typeCount,
    typesSucceeded: synced.ingest.typesSucceeded,
    typesFailed: synced.ingest.typesFailed,
    rowsUpserted: synced.ingest.rowsUpserted,
    summaryRowsWritten: synced.summaryRowsWritten,
    failedTypeIds: synced.ingest.failedTypeIds,
  };
});
