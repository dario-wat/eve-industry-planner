/*
* Clears cache. Table esi_cache
* Run like this:
* ts-node ./server/src/scripts/clearCache.ts
*/
import { initDatabaseSequelize } from '../loaders/initDatabase';
import { EsiCache, esiCacheModelDefine } from '../models/EsiCache';


async function run() {
  const sequelize = initDatabaseSequelize();
  esiCacheModelDefine(sequelize);
  const rowsDropped = await EsiCache.destroy({
    where: {},
    truncate: true
  });
  console.log('Cache cleared!');
  console.log('Rows dropped: ' + rowsDropped);
}

run();