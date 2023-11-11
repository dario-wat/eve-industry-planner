/**
 * This script is used to filter out a bunch of type Ids that cannot be used
 * for trading, e.g.
 * 1. Non-tradeable
 * 2. Never traded
 * 3. Very infrequently traded
 * 4. Items with low price (< 1M isk)
 * 5. Items with low daily volume (< 1B isk)
 * ...
 * This script may need to be adjusted over time.
 * 
 * This script would ideally need to run only once and produce histories
 * for all potentially traded items. But likely it will need to run
 * periodically, maybe once a week or once a month.
 * 
 * ts-node ./server/src/scripts/generatePotentialItems.ts
 */
import 'reflect-metadata';

import { itemSaleVolume } from '../const/itemSaleVolumes';
import { initDatabase } from '../loaders/initDatabase';
import Container from 'typedi';
import { Sequelize } from 'sequelize';
import EveSdeData from '../core/sde/EveSdeData';
import { APPAREL, BLUEPRINT, INFRASTRUCTURE_UPGRADES, ORBITALS, SKILL, SKINS, SOVEREIGNTY_STRUCTURES, STRUCTURE, STRUCTURE_MODULE } from '../const/Categories';
import EsiTokenlessQueryService from '../core/query/EsiTokenlessQueryService';
import { THE_FORGE } from '../const/IDs';
import { chunk } from 'underscore';
import { mean } from 'lodash';
import fs from 'fs';

const characterId = 1838729723;

const recentDays = 30;
const minAvgPrice = 1000000;  // 1M
const minAvgIskVolume = 1000000000; // 1B

const ignoreCategories = [
  BLUEPRINT, SKINS, SKILL, APPAREL, ORBITALS, STRUCTURE,
  INFRASTRUCTURE_UPGRADES, SOVEREIGNTY_STRUCTURES, STRUCTURE_MODULE
];

function LOG(message: string) {
  console.log('[Script]', message);
}

async function run() {
  const itemSaleVolumeEntries = Object.entries(itemSaleVolume)
    .map(([typeIdStr, volume]) => ([Number(typeIdStr), volume] as const));
  LOG(`Total ${itemSaleVolumeEntries.length} items.`);

  const tradeableItems = itemSaleVolumeEntries
    .filter(([_, volume]) => volume !== null) as [number, number][];
  LOG(
    `Total ${tradeableItems.length} tradeable items.` +
    ` Removed ${itemSaleVolumeEntries.length - tradeableItems.length} items.`
  )

  const tradedItems = tradeableItems.filter(([_, volume]) => volume > 0);
  LOG(
    `Total ${tradedItems.length} traded items (volume > 0).` +
    ` Removed ${tradeableItems.length - tradedItems.length} items.`
  )

  const commonItems = tradedItems.filter(([_, volume]) => volume > 1000);
  LOG(
    `Total ${commonItems.length} traded items (volume > 1000).` +
    ` Removed ${tradedItems.length - commonItems.length} items.`
  )

  initDatabase();

  const sequelize = Container.get(Sequelize);

  await sequelize.authenticate();
  LOG('Connected to MySQL.');
  await sequelize.sync();

  LOG('Initializing SDE');
  const sdeData = await EveSdeData.init();
  LOG('Done!');

  const nonIgnoredItems = commonItems.filter(([typeId, _]) =>
    !ignoreCategories.includes(sdeData.categoryIdFromTypeId(typeId)!)
  );
  LOG(
    `Total ${nonIgnoredItems.length} non-ignored items.` +
    ` Removed ${commonItems.length - nonIgnoredItems.length} items.`
  )

  const esiQuery = Container.get(EsiTokenlessQueryService);
  const typeIds = nonIgnoredItems.map(([typeId, _]) => typeId);
  const chunks = chunk(typeIds, 100);

  const result: number[] = [];
  const failed = [];
  for (const typeIdChunk of chunks) {
    LOG(`TypeId: ${typeIdChunk}`);
    await Promise.all(
      typeIdChunk.map(async typeId => {
        try {
          const history = await esiQuery.genxRegionMarketHistory(
            characterId,
            THE_FORGE,
            typeId,
          );

          const recentHistory = history.sort((a, b) =>
            b.date.localeCompare(a.date)
          ).slice(0, recentDays);
          const avgPrice = mean(recentHistory.map(h => h.average));
          const avgIskVolume = mean(recentHistory.map(h => h.average * h.volume));

          if (avgPrice > minAvgPrice && avgIskVolume > minAvgIskVolume) {
            result.push(typeId);
          }
        } catch {
          failed.push(typeId);
        }
      })
    );
  }

  fs.writeFile('potentialItems.txt', JSON.stringify(result), () => { });

  LOG(Object.entries(result).length.toLocaleString())
}

run();