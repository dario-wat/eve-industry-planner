/* eslint-disable @typescript-eslint/no-explicit-any */

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

import yaml from 'js-yaml';
import fs from 'fs';
import Container from 'typedi';
import { Sequelize } from 'sequelize';
import { Model, ModelStatic } from 'sequelize/types';
import { GroupID } from '../core/sde/models/GroupID';
import { IconID } from '../core/sde/models/IconID';
import { TypeID } from '../core/sde/models/TypeID';
import { CategoryID } from '../core/sde/models/CategoryID';
import { Station } from '../core/sde/models/Station';
import { InvItem } from '../core/sde/models/InvItem';
import { InvUniqueName } from '../core/sde/models/InvUniqueName';
import {
  Blueprint,
  BpCopyingMaterials,
  BpInventionMaterials,
  BpManufacturingMaterials,
  BpMeMaterials,
  BpTeMaterials,
  BpInventionProducts,
  BpManufacturingProducts,
  BpReactionMaterials,
  BpReactionProducts,
} from '../core/sde/models/Blueprint';
import { initDatabaseForSdeScript } from '../loaders/initDatabase';

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
  const result: any = yaml.load(cleanedUpInput ?? fileContent);

  LOG && LOG('[Script] Transforming YAML');
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
    [Blueprint.name]: {
      id: key,
      copying_time: value.activities.copying?.time,
      invention_time: value.activities.invention?.time,
      manufacturing_time: value.activities.manufacturing?.time,
      research_material_time: value.activities.research_material?.time,
      research_time_time: value.activities.research_time?.time,
      reaction_time: value.activities.reaction?.time,
    },
    [BpCopyingMaterials.name]:
      (value.activities.copying?.materials ?? []).map(materialMapper),
    [BpInventionMaterials.name]:
      (value.activities.invention?.materials ?? []).map(materialMapper),
    [BpManufacturingMaterials.name]:
      (value.activities.manufacturing?.materials ?? []).map(materialMapper),
    [BpReactionMaterials.name]:
      (value.activities.reaction?.materials ?? []).map(materialMapper),
    [BpMeMaterials.name]:
      (value.activities.research_material?.materials ?? []).map(materialMapper),
    [BpTeMaterials.name]:
      (value.activities.research_time?.materials ?? []).map(materialMapper),
    [BpInventionProducts.name]:
      (value.activities.invention?.products ?? []).map(materialMapper),
    [BpManufacturingProducts.name]:
      (value.activities.manufacturing?.products ?? []).map(materialMapper),
    [BpReactionProducts.name]:
      (value.activities.reaction?.products ?? []).map(materialMapper),
  };
}

async function loadBlueprintData() {
  const fileName = 'sde/fsd/blueprints.yaml';
  LOG && LOG('[Script] Reading file: %s', fileName);
  const fileContent = fs.readFileSync(fileName, 'utf8');

  LOG && LOG('[Script] Parsing YAML');
  const result: any = yaml.load(fileContent);

  const records = Object.entries(result).map(extractBlueprintData);

  LOG && LOG('[Script] Storing into the database');
  await Blueprint.bulkCreate(
    records.map((o: any) => o[Blueprint.name]),
    { logging: SEQUELIZE_LOG },
  );

  const bulkCreateHelper =
    async <MS extends ModelStatic<Model>>(model: MS) =>
      await model.bulkCreate(
        records.map((o: any) => o[model.name]).flat(),
        { logging: SEQUELIZE_LOG },
      );

  await bulkCreateHelper(BpCopyingMaterials);
  await bulkCreateHelper(BpInventionMaterials);
  await bulkCreateHelper(BpManufacturingMaterials);
  await bulkCreateHelper(BpReactionMaterials);
  await bulkCreateHelper(BpMeMaterials);
  await bulkCreateHelper(BpTeMaterials);
  await bulkCreateHelper(BpInventionProducts);
  await bulkCreateHelper(BpManufacturingProducts);
  await bulkCreateHelper(BpReactionProducts);
}

async function run() {
  LOG && LOG('[Script] Script started');

  initDatabaseForSdeScript();
  const sequelize = Container.get(Sequelize);
  await sequelize.authenticate({ logging: SEQUELIZE_LOG });

  LOG && LOG('[Script] Recreating tables');
  await sequelize.sync({ force: true, logging: SEQUELIZE_LOG });

  await loadDataToDatabase(
    'sde/fsd/typeIDs.yaml',
    ([key, value]: [string, any]) => ({
      id: key,
      group_id: value.groupID,
      name: value.name.en,
      meta_group_id: value.metaGroupID,
    }),
    TypeID,
    {
      cleanupInputFn: (inString: string) =>
        inString
          .replaceAll('\r\n\'\r\n', '\r\n            \'\r\n')
          .replaceAll('\n\'\n', '\n            \'\n'),
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
    GroupID,
  );

  await loadDataToDatabase(
    'sde/fsd/iconIDs.yaml',
    ([key, value]: [string, any]) => ({
      id: key,
      description: value.description,
      icon_file: value.iconFile,
    }),
    IconID,
  );

  await loadDataToDatabase(
    'sde/fsd/categoryIDs.yaml',
    ([key, value]: [string, any]) => ({
      id: key,
      name: value.name.en,
    }),
    CategoryID,
  );

  await loadDataToDatabase(
    'sde/bsd/staStations.yaml',
    ([_key, value]: [string, any]) => ({
      id: value.stationID,
      name: value.stationName,
      region_id: value.regionID,
    }),
    Station,
  );

  await loadDataToDatabase(
    'sde/bsd/invItems.yaml',
    ([_key, value]: [string, any]) => ({
      item_id: value.itemID,
      type_id: value.typeID,
      location_id: value.locationID,
    }),
    InvItem,
  );

  await loadDataToDatabase(
    'sde/bsd/invUniqueNames.yaml',
    ([_key, value]: [string, any]) => ({
      item_id: value.itemID,
      item_name: value.itemName,
    }),
    InvUniqueName,
  );

  await loadBlueprintData();

  LOG && LOG('[Script] Finished!');
}

run();