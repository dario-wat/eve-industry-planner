import {
  blueprintModelDefine,
  bpCopyingMaterialsDefine,
  bpInventionMaterialsDefine,
  bpManufacturingMaterialsDefine,
  bpMeMaterialsDefine,
  bpTeMaterialsDefine,
  bpInventionProductsDefine,
  bpManufacturingProductsDefine,
} from '../models/Blueprint';
import { groupIdModelDefine } from '../models/GroupID';
import { iconIdModelDefine } from '../models/IconID';
import { typeIdModelDefine } from '../models/TypeID';
import { categoryIdModelDefine } from '../models/CategoryID';
import { stationModelDefine } from '../models/Station';
import { Sequelize } from 'sequelize/types';

// Every new model definer needs to be added here
export default function defineAllSequelizeModels(sequelize: Sequelize) {
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