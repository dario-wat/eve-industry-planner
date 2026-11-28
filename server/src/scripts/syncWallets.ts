/*
 * Stores the wallet journal and wallet transactions ESI still has for every logged-in character.
 * Net worth reads transfers from the journal.
 *
 *   npm run sync-wallets
 */
import 'reflect-metadata';
import 'dotenv/config';

import Container from 'typedi';
import { Sequelize } from 'sequelize';
import { initDatabase } from '../loaders/initDatabase';
import WalletSyncService from '../features/wallet/WalletSyncService';
import { genxRunJob, JobFailure } from '../core/job/runJob';

async function run(): Promise<void> {
  if (process.argv.length > 2) {
    console.log('Usage: npm run sync-wallets');
    process.exit(process.argv.includes('--help') ? 0 : 1);
  }
  initDatabase();
  const sequelize = Container.get(Sequelize);
  await sequelize.authenticate();

  try {
    await genxRunJob('wallet_sync', async () => {
      const result = await Container.get(WalletSyncService).genxSyncAllWallets();
      console.log(
        `Stored ${result.stored.length}, failed ${result.failed.length}, ` +
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
