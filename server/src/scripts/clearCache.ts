/*
* Clears cache. Table esi_cache
* Run like this:
* ts-node ./server/src/scripts/clearCache.ts
*/
import { EsiCacheAction } from '../services/foundation/EsiCacheAction';
import { initDatabaseSequelize } from '../loaders/initDatabase';
import { esiCacheModelDefine } from '../models/EsiCache';


async function run() {
  const sequelize = initDatabaseSequelize();
  esiCacheModelDefine(sequelize);
  const rowsDropped = await EsiCacheAction.genClearCache();
  console.log('Cache cleared!');
  console.log('Rows dropped: ' + rowsDropped);
}

run();