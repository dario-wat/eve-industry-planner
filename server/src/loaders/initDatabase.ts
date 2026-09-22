import 'dotenv/config';
import { Sequelize } from 'sequelize';
import Container from 'typedi';
import {
  blueprintModelDefine,
  bpCopyingMaterialsDefine,
  bpInventionMaterialsDefine,
  bpManufacturingMaterialsDefine,
  bpMeMaterialsDefine,
  bpTeMaterialsDefine,
  bpInventionProductsDefine,
  bpManufacturingProductsDefine,
  bpReactionMaterialsDefine,
  bpReactionProductsDefine,
} from '../core/sde/models/Blueprint';
import { groupModelDefine } from '../core/sde/models/Group';
import { iconModelDefine } from '../core/sde/models/Icon';
import { typeModelDefine } from '../core/sde/models/Type';
import { categoryModelDefine } from '../core/sde/models/Category';
import { stationModelDefine } from '../core/sde/models/Station';
import { solarSystemModelDefine } from '../core/sde/models/SolarSystem';
import { plannedProductModelDefine } from '../features/planned_product/PlannedProduct';
import { esiCacheModelDefine } from '../core/esi_cache/EsiCache';
import { materialStationModelDefine } from '../features/material_station/MaterialStation';
import { appLogModelDefine } from '../core/logger/AppLog';
import { esiAccountModelDefine } from '../core/esi/models/EsiAccount';
import { esiCharacterModelDefine } from '../core/esi/models/EsiCharacter';
import { esiTokenModelDefine } from '../core/esi/models/EsiToken';
import { esiAssocsDefine } from '../core/esi/models/EsiAssocs';
import { walletTransactionModelDefine } from '../features/wallet/WalletTransaction';
import { accountModelDefine } from '../core/account/Account';
import { accountAssocsDefine } from '../core/account/AccountAssocs';
import { materialStationAssocsDefine } from '../features/material_station/MaterialStationAssocs';
import { plannedProductAssocsDefine } from '../features/planned_product/PlannedProductAssocs';
import { industryJobAssocsDefine } from '../features/industry_jobs/IndustryJobAssocs';
import { industryJobModelDefine } from '../features/industry_jobs/IndustryJob';
import { walletTransactionAssocsDefine } from '../features/wallet/WalletTransactionAssocs';
import { walletJournalEntryModelDefine } from '../features/wallet/WalletJournalEntry';
import { marketHistoryDailyModelDefine } from '../features/market/MarketHistoryDaily';

export function initDatabaseSequelize(): Sequelize {
  const sequelize = new Sequelize(
    process.env.DATABASE_NAME!,
    process.env.DATABASE_USERNAME!,
    process.env.DATABASE_PASSWORD,
    {
      host: process.env.DATABASE_HOST!,
      port: Number(process.env.DATABASE_PORT!),
      dialect: 'mysql',
      logging: false,
    },
  );

  Container.set(Sequelize, sequelize);

  return sequelize;
}

// Every new model definer needs to be added here
// Do not use this in the SDE script because all
// tables will be dropped.
export function initDatabase(): void {
  const sequelize = initDatabaseSequelize();

  // Eve SDE
  typeModelDefine(sequelize);
  groupModelDefine(sequelize);
  iconModelDefine(sequelize);
  categoryModelDefine(sequelize);
  stationModelDefine(sequelize);
  solarSystemModelDefine(sequelize);

  blueprintModelDefine(sequelize);

  // Blueprint related SDE
  bpCopyingMaterialsDefine(sequelize);
  bpInventionMaterialsDefine(sequelize);
  bpManufacturingMaterialsDefine(sequelize);
  bpReactionMaterialsDefine(sequelize);
  bpMeMaterialsDefine(sequelize);
  bpTeMaterialsDefine(sequelize);
  bpInventionProductsDefine(sequelize);
  bpManufacturingProductsDefine(sequelize);
  bpReactionProductsDefine(sequelize);

  // App models (non-SDE)
  accountModelDefine(sequelize);
  plannedProductModelDefine(sequelize);
  materialStationModelDefine(sequelize);
  walletTransactionModelDefine(sequelize);
  walletJournalEntryModelDefine(sequelize);
  industryJobModelDefine(sequelize);
  marketHistoryDailyModelDefine(sequelize);

  // Special
  esiCacheModelDefine(sequelize);
  appLogModelDefine(sequelize);

  // Esi
  esiAccountModelDefine(sequelize);
  esiCharacterModelDefine(sequelize);
  esiTokenModelDefine(sequelize);

  // Assocs
  esiAssocsDefine();
  accountAssocsDefine();
  materialStationAssocsDefine();
  plannedProductAssocsDefine();
  industryJobAssocsDefine();
  walletTransactionAssocsDefine();
}

// This should define ONLY SDE models
export function initDatabaseForSdeScript(): void {
  const sequelize = initDatabaseSequelize();

  // Eve SDE
  typeModelDefine(sequelize);
  groupModelDefine(sequelize);
  iconModelDefine(sequelize);
  categoryModelDefine(sequelize);
  stationModelDefine(sequelize);
  solarSystemModelDefine(sequelize);

  blueprintModelDefine(sequelize);

  // Blueprint related SDE
  bpCopyingMaterialsDefine(sequelize);
  bpInventionMaterialsDefine(sequelize);
  bpManufacturingMaterialsDefine(sequelize);
  bpReactionMaterialsDefine(sequelize);
  bpMeMaterialsDefine(sequelize);
  bpTeMaterialsDefine(sequelize);
  bpInventionProductsDefine(sequelize);
  bpManufacturingProductsDefine(sequelize);
  bpReactionProductsDefine(sequelize);
}
