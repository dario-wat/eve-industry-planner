import { Sequelize } from 'sequelize';
import { Dialect } from 'sequelize/types';
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
import { groupIdModelDefine } from '../core/sde/models/GroupID';
import { iconIdModelDefine } from '../core/sde/models/IconID';
import { typeIdModelDefine } from '../core/sde/models/TypeID';
import { categoryIdModelDefine } from '../core/sde/models/CategoryID';
import { stationModelDefine } from '../core/sde/models/Station';
import { plannedProductModelDefine } from '../features/planned_product/PlannedProduct';
import { esiCacheModelDefine } from '../core/esi_cache/EsiCache';
import { materialStationModelDefine } from '../features/material_station/MaterialStation';
import { appLogModelDefine } from '../core/logger/AppLog';
import { esiAccountModelDefine } from '../core/esi/models/EsiAccount';
import { esiCharacterModelDefine } from '../core/esi/models/EsiCharacter';
import { esiTokenModelDefine } from '../core/esi/models/EsiToken';
import { esiAssocsDefine } from '../core/esi/models/EsiAssocs';
import { walletTransactionModelDefine } from '../features/wallet/WalletTransaction';
import { scribbleModelDefine } from '../features/scribble/Scribble';
import { alwaysBuyItemModelDefine } from '../features/always_buy/AlwaysBuyItem';
import { accountModelDefine } from '../core/account/Account';
import { accountAssocsDefine } from '../core/account/AccountAssocs';
import { scribbleAssocsDefine } from '../features/scribble/ScribbleAssocs';
import { alwaysBuyItemAssocsDefine } from '../features/always_buy/AlwaysBuyItemAssocs';
import { materialStationAssocsDefine } from '../features/material_station/MaterialStationAssocs';
import { plannedProductAssocsDefine } from '../features/planned_product/PlannedProductAssocs';
import { industryJobAssocsDefine } from '../features/industry_jobs/IndustryJobAssocs';
import { industryJobModelDefine } from '../features/industry_jobs/IndustryJob';
import { walletTransactionAssocsDefine } from '../features/wallet/WalletTransactionAssocs';
import { invItemModelDefine } from '../core/sde/models/InvItem';
import { invUniqueNameModelDefine } from '../core/sde/models/InvUniqueName';

export function initDatabaseSequelize(): Sequelize {
  const sequelize = new Sequelize(
    process.env.DATABASE_NAME!,
    process.env.DATABASE_USERNAME!,
    process.env.DATABASE_PASSWORD!,
    {
      host: process.env.DATABASE_HOST!,
      port: Number(process.env.DATABASE_PORT!),
      dialect: 'mysql' as Dialect,
      logging: false,
    }
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
  typeIdModelDefine(sequelize);
  groupIdModelDefine(sequelize);
  iconIdModelDefine(sequelize);
  categoryIdModelDefine(sequelize);
  stationModelDefine(sequelize);
  invItemModelDefine(sequelize);
  invUniqueNameModelDefine(sequelize);

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
  scribbleModelDefine(sequelize);
  alwaysBuyItemModelDefine(sequelize);
  industryJobModelDefine(sequelize);

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
  scribbleAssocsDefine();
  alwaysBuyItemAssocsDefine();
  materialStationAssocsDefine();
  plannedProductAssocsDefine();
  industryJobAssocsDefine();
  walletTransactionAssocsDefine();
}

// This should define ONLY SDE models
export function initDatabaseForSdeScript(): void {
  const sequelize = initDatabaseSequelize();

  // Eve SDE
  typeIdModelDefine(sequelize);
  groupIdModelDefine(sequelize);
  iconIdModelDefine(sequelize);
  categoryIdModelDefine(sequelize);
  stationModelDefine(sequelize);
  invItemModelDefine(sequelize);
  invUniqueNameModelDefine(sequelize);

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