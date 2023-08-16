import { Sequelize } from 'sequelize';
import Container from 'typedi';
import databaseConfig from '../config/databaseConfig';
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
import { plannedProductModelDefine } from '../models/PlannedProduct';
import { esiCacheModelDefine } from '../core/esi_cache/EsiCache';
import { materialStationModelDefine } from '../models/MaterialStation';
import { appLogModelDefine } from '../core/logger/AppLog';
import { esiAccountModelDefine } from '../core/esi/models/EsiAccount';
import { esiCharacterModelDefine } from '../core/esi/models/EsiCharacter';
import { esiTokenModelDefine } from '../core/esi/models/EsiToken';
import esiAssocsDefine from '../core/esi/models/EsiAssocs';
import { characterClusterModelDefine } from '../models/CharacterCluster';
import { walletTransactionModelDefine } from '../models/WalletTransaction';
import { scribbleModelDefine } from '../models/Scribble';
import { alwaysBuyItemModelDefine } from '../models/AlwaysBuyItem';
import { accountModelDefine } from '../core/account/Account';
import { accountAssocsDefine } from '../core/account/AccountAssocs';

export function initDatabaseSequelize(): Sequelize {
  const sequelize = new Sequelize(
    databaseConfig.name,
    databaseConfig.username,
    databaseConfig.password,
    {
      host: databaseConfig.host,
      port: databaseConfig.port,
      dialect: databaseConfig.dialect,
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
  characterClusterModelDefine(sequelize);
  walletTransactionModelDefine(sequelize);
  scribbleModelDefine(sequelize);
  alwaysBuyItemModelDefine(sequelize);

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