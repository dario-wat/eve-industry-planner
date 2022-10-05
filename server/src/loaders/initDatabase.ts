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
} from '../models/sde/Blueprint';
import { groupIdModelDefine } from '../models/sde/GroupID';
import { iconIdModelDefine } from '../models/sde/IconID';
import { typeIdModelDefine } from '../models/sde/TypeID';
import { categoryIdModelDefine } from '../models/sde/CategoryID';
import { stationModelDefine } from '../models/sde/Station';
import { plannedProductModelDefine } from '../models/PlannedProduct';
import { esiCacheModelDefine } from '../models/EsiCache';
import { materialStationModelDefine } from '../models/MaterialStation';
import { appLogModelDefine } from '../models/AppLog';
import { esiAccountModelDefine } from '../models/esi_provider/EsiAccount';
import { esiCharacterModelDefine } from '../models/esi_provider/EsiCharacter';
import { esiTokenModelDefine } from '../models/esi_provider/EsiToken';
import esiAssocsDefine from '../models/esi_provider/EsiAssocs';
import { characterClusterModelDefine } from '../models/CharacterCluster';
import { walletTransactionModelDefine } from '../models/WalletTransaction';
import { scribbleModelDefine } from '../models/Scribble';

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
  plannedProductModelDefine(sequelize);
  materialStationModelDefine(sequelize);
  characterClusterModelDefine(sequelize);
  walletTransactionModelDefine(sequelize);
  scribbleModelDefine(sequelize);

  // Special
  esiCacheModelDefine(sequelize);
  appLogModelDefine(sequelize);

  // Esi
  esiAccountModelDefine(sequelize);
  esiCharacterModelDefine(sequelize);
  esiTokenModelDefine(sequelize);
  esiAssocsDefine();
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