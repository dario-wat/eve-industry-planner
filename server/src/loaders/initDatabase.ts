import { Sequelize } from 'sequelize';
import Container from 'typedi';
import databaseConfig from '../config/databaseConfig';
import { DIKeys } from '../lib/DIKeys';
import {
  blueprintModelDefine,
  bpCopyingMaterialsDefine,
  bpInventionMaterialsDefine,
  bpManufacturingMaterialsDefine,
  bpMeMaterialsDefine,
  bpTeMaterialsDefine,
  bpInventionProductsDefine,
  bpManufacturingProductsDefine,
} from '../models/sde/Blueprint';
import { groupIdModelDefine } from '../models/sde/GroupID';
import { iconIdModelDefine } from '../models/sde/IconID';
import { typeIdModelDefine } from '../models/sde/TypeID';
import { categoryIdModelDefine } from '../models/sde/CategoryID';
import { stationModelDefine } from '../models/sde/Station';

// Every new model definer needs to be added here
// Do not use this in the SDE script because all
// tables will be dropped.
export function initDatabase() {
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

  Container.set(DIKeys.DB, sequelize);

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
  bpMeMaterialsDefine(sequelize);
  bpTeMaterialsDefine(sequelize);
  bpInventionProductsDefine(sequelize);
  bpManufacturingProductsDefine(sequelize);
}

// This should define ONLY SDE models
export function initDatabaseForSdeScript() {
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

  Container.set(DIKeys.DB, sequelize);

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
  bpMeMaterialsDefine(sequelize);
  bpTeMaterialsDefine(sequelize);
  bpInventionProductsDefine(sequelize);
  bpManufacturingProductsDefine(sequelize);
}