/*
* This script will read yaml files from SDE (not all, but only the ones
* specified in this script) and store them into the database. Only some
* fields will be stored (again the ones defined in the scripts).
*
* Note: some files may be quite large so it could take a while.
* Run like this:
* ts-node ./server/src/scripts/loadDataIntoMySqlScript.ts
*/
import 'reflect-metadata';

import { parse } from 'yaml';
import fs from 'fs';
import Container from 'typedi';
import { Model, ModelStatic, Sequelize } from 'sequelize/types';
import SequelizeService from '../services/SequelizeService';
import { groupIdModelDefine } from '../models/GroupID';
import { iconIdModelDefine } from '../models/IconID';
import { typeIdModelDefine } from '../models/TypeID';
import { categoryIdModelDefine } from '../models/CategoryID';
import { stationModelDefine } from '../models/Station';
import {
  blueprintModelDefine,
  bpCopyingMaterialsDefine,
  bpInventionMaterialsDefine,
  bpManufacturingMaterialsDefine,
  bpMeMaterialsDefine,
  bpTeMaterialsDefine,
  bpInventionProductsDefine,
  bpManufacturingProductsDefine,
  Blueprint,
  BpCopyingMaterials,
  BpInventionMaterials,
  BpManufacturingMaterials,
  BpMeMaterials,
  BpTeMaterials,
  BpInventionProducts,
  BpManufacturingProducts,
} from '../models/Blueprint';

// Either console.log or false
const LOG = console.log;
const SEQUELIZE_LOG = false;

async function loadDataToDatabase<MS extends ModelStatic<Model>>(
  fileName: string,
  transformFn: ([keyof, value]: [string, any]) => any,
  model: MS,
  options?:
    {
      cleanupInputFn?: ((inString: string) => string) | undefined,
    },
) {
  LOG && LOG('[Script] Reading file: %s', fileName);
  const fileContent = fs.readFileSync(fileName, 'utf8');

  let cleanedUpInput;
  if (options && options.cleanupInputFn) {
    LOG && LOG('[Script] Cleaning up content');
    cleanedUpInput = options.cleanupInputFn(fileContent);
  }

  LOG && LOG('[Script] Parsing YAML');
  const result = parse(cleanedUpInput ?? fileContent);

  const records = Object.entries(result).map(transformFn);
  LOG && LOG('[Script] Storing into the database');
  await model.bulkCreate(records, { logging: SEQUELIZE_LOG });
}

function extractBlueprintData([key, value]: [string, any]) {
  const materialMapper = (o: any) => ({
    blueprint_id: key,
    type_id: o.typeID,
    quantity: o.quantity,
  });

  return {
    [Blueprint.MODEL_NAME]: {
      id: key,
      copying_time: value.activities.copying?.time,
      invention_time: value.activities.invention?.time,
      manufacturing_time: value.activities.manufacturing?.time,
      research_material_time: value.activities.research_material?.time,
      research_time_time: value.activities.research_time?.time,
    },
    [BpCopyingMaterials.MODEL_NAME]:
      (value.activities.copying?.materials ?? []).map(materialMapper),
    [BpInventionMaterials.MODEL_NAME]:
      (value.activities.invention?.materials ?? []).map(materialMapper),
    [BpManufacturingMaterials.MODEL_NAME]:
      (value.activities.manufacturing?.materials ?? []).map(materialMapper),
    [BpMeMaterials.MODEL_NAME]:
      (value.activities.research_material?.materials ?? []).map(materialMapper),
    [BpTeMaterials.MODEL_NAME]:
      (value.activities.research_time?.materials ?? []).map(materialMapper),
    [BpInventionProducts.MODEL_NAME]:
      (value.activities.invention?.products ?? []).map(materialMapper),
    [BpManufacturingProducts.MODEL_NAME]:
      (value.activities.manufacturing?.products ?? []).map(materialMapper),
  };
}

async function loadBlueprintData(sequelize: Sequelize) {
  const fileName = 'sde/fsd/blueprints.yaml';
  LOG && LOG('[Script] Reading file: %s', fileName);
  const fileContent = fs.readFileSync(fileName, 'utf8');

  LOG && LOG('[Script] Parsing YAML');
  const result = parse(fileContent);

  const records = Object.entries(result).map(extractBlueprintData);

  LOG && LOG('[Script] Storing into the database');
  await sequelize.model(Blueprint.MODEL_NAME).bulkCreate(
    records.map((o: any) => o[Blueprint.MODEL_NAME]),
    { logging: SEQUELIZE_LOG },
  );

  const bulkCreateHelper = async (modelName: string) =>
    await sequelize.model(modelName).bulkCreate(
      records.map((o: any) => o[modelName]).flat(),
      { logging: SEQUELIZE_LOG },
    );

  await bulkCreateHelper(BpCopyingMaterials.MODEL_NAME);
  await bulkCreateHelper(BpInventionMaterials.MODEL_NAME);
  await bulkCreateHelper(BpManufacturingMaterials.MODEL_NAME);
  await bulkCreateHelper(BpMeMaterials.MODEL_NAME);
  await bulkCreateHelper(BpTeMaterials.MODEL_NAME);
  await bulkCreateHelper(BpInventionProducts.MODEL_NAME);
  await bulkCreateHelper(BpManufacturingProducts.MODEL_NAME);
}

async function run() {
  LOG && LOG('[Script] Script started');

  const sequelize = Container.get(SequelizeService).get();
  await sequelize.authenticate({ logging: SEQUELIZE_LOG }).then(() => {
    LOG && LOG('[Script] Connection has been established successfully.');
  }).catch((error) => {
    console.error('[Script] Unable to connect to the database: ', error);
  });

  // TODO(EIP-5) this should be put into a function since it appears in
  // more than one place
  const typeIdModel = typeIdModelDefine(sequelize);
  const groupIdModel = groupIdModelDefine(sequelize);
  const iconIdModel = iconIdModelDefine(sequelize);
  const categoryIdModel = categoryIdModelDefine(sequelize);
  const stationModel = stationModelDefine(sequelize);

  blueprintModelDefine(sequelize);
  bpCopyingMaterialsDefine(sequelize);
  bpInventionMaterialsDefine(sequelize);
  bpManufacturingMaterialsDefine(sequelize);
  bpMeMaterialsDefine(sequelize);
  bpTeMaterialsDefine(sequelize);
  bpInventionProductsDefine(sequelize);
  bpManufacturingProductsDefine(sequelize);

  LOG && LOG('[Script] Recreating tables');
  await sequelize.sync({ force: true, logging: SEQUELIZE_LOG });

  await loadDataToDatabase(
    'sde/fsd/typeIDs.yaml',
    ([key, value]: [string, any]) => ({
      id: key,
      group_id: value.groupID,
      name: value.name.en
    }),
    typeIdModel,
    {
      cleanupInputFn: (inString: string) =>
        inString
          .replaceAll("\r\n'\r\n", "\r\n            '\r\n")
          .replaceAll("\n'\n", "\n            '\n"),
    },
  );

  await loadDataToDatabase(
    'sde/fsd/groupIDs.yaml',
    ([key, value]: [string, any]) => ({
      id: key,
      category_id: value.categoryID,
      icon_id: value.iconID,
      name: value.name.en
    }),
    groupIdModel,
  );

  await loadDataToDatabase(
    'sde/fsd/iconIDs.yaml',
    ([key, value]: [string, any]) => ({
      id: key,
      description: value.description,
      icon_file: value.iconFile,
    }),
    iconIdModel,
  );

  await loadDataToDatabase(
    'sde/fsd/categoryIDs.yaml',
    ([key, value]: [string, any]) => ({
      id: key,
      name: value.name.en,
    }),
    categoryIdModel,
  );

  await loadDataToDatabase(
    'sde/bsd/staStations.yaml',
    ([_key, value]: [string, any]) => ({
      id: value.stationID,
      name: value.stationName,
    }),
    stationModel,
  );

  await loadBlueprintData(sequelize);

  LOG && LOG('[Script] Finished!');
}

run();