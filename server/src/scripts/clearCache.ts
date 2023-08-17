/*
* Clears cache. Table esi_cache
* Run like this:
* ts-node ./server/src/scripts/clearCache.ts
*/
import { genClearEsiCache } from '../core/esi_cache/EsiCacheAction';
import { initDatabaseSequelize } from '../loaders/initDatabase';
import { esiCacheModelDefine } from '../core/esi_cache/EsiCache';


async function run() {
  const sequelize = initDatabaseSequelize();
  esiCacheModelDefine(sequelize);
  const rowsDropped = await genClearEsiCache();
  console.log('Cache cleared!');
  console.log('Rows dropped: ' + rowsDropped);
}

run();