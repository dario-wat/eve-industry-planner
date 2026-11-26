/*
 * Stores today's (UTC) wallet, order, and asset values for every logged-in character.
 *
 *   npm run snapshot-net-worth
 */
import 'reflect-metadata';
import 'dotenv/config';

import Container from 'typedi';
import { Sequelize } from 'sequelize';
import { initDatabase } from '../loaders/initDatabase';
import NetWorthService from '../features/net_worth/NetWorthService';
import { genxRunJob, JobFailure } from '../core/job/runJob';

async function run(): Promise<void> {
  if (process.argv.length > 2) {
    console.log('Usage: npm run snapshot-net-worth');
    process.exit(process.argv.includes('--help') ? 0 : 1);
  }
  initDatabase();
  const sequelize = Container.get(Sequelize);
  await sequelize.authenticate();

  try {
    await genxRunJob('net_worth', async () => {
      const result = await Container.get(NetWorthService).genxSnapshotAll();
      console.log(
        `Day ${result.day}: stored ${result.stored.length}, failed ${result.failed.length}, ` +
        `logged out ${result.skippedLoggedOut.length}`,
      );
      if (result.failed.length > 0) {
        throw new JobFailure(`${result.failed.length} character(s) failed`, result);
      }
      return result;
    });
  } finally {
    await sequelize.close();
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Aborted. ${message}`);
  process.exit(1);
});
