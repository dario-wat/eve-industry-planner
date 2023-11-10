/**
 * Finds all tradeable items by querying the number of items
 * traded in The Forge in the past year or so.
 * 
 * ts-node ./server/src/scripts/tradeableItems.ts
 */
import 'reflect-metadata';

import { THE_FORGE } from '../const/IDs';
import EsiTokenlessQueryService from '../core/query/EsiTokenlessQueryService';
import EveSdeData from '../core/sde/EveSdeData';
import { initDatabase } from '../loaders/initDatabase';
import { sum } from 'lodash';
import { Sequelize } from 'sequelize';
import Container from 'typedi';
import fs from 'fs';

const characterId = 1838729723;

function LOG(message: string) {
  console.log('[Script]', message);
}

async function run() {
  LOG('Started!');

  initDatabase();

  const sequelize = Container.get(Sequelize);

  await sequelize.authenticate();
  LOG('Connected to MySQL.');
  await sequelize.sync();

  LOG('Initializing SDE');
  const sdeData = await EveSdeData.init();
  LOG('Done!');

  const esiQuery = Container.get(EsiTokenlessQueryService);

  const typeIds = Object.values(sdeData.types).map(t => t.id);

  const result: Record<number, number | null> = {};
  const failed = [];
  let i = 0;
  for (const typeId of typeIds) {
    if (i % 20 === 0) {
      LOG(`Count: ${i}`);
    }
    i += 1;

    try {
      const history = await esiQuery.genRegionMarketHistory(
        characterId,
        THE_FORGE,
        typeId
      );

      if (history === null) {
        result[typeId] = null;
      } else {
        result[typeId] = sum(history.map(h => h.volume));
      }
    } catch {
      failed.push(typeId);
    }

    LOG(`TypeID: ${typeId}, volume: ${result[typeId]}`);
  }

  fs.writeFile('tradeableItems.txt', JSON.stringify(result), () => { });
  LOG(`Failed typeIds: ${failed}`);

  LOG('Finished!');
}

run();