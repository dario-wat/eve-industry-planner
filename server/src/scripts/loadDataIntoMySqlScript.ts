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
import { Model, ModelStatic } from 'sequelize/types';
import SequelizeService from '../services/SequelizeService';
import { groupIdModelDefine } from '../models/GroupID';
import { iconIdModelDefine } from '../models/IconID';
import { typeIdModelDefine } from '../models/TypeID';
import { categoryIdModelDefine } from '../models/CategoryID';
import { stationModelDefine } from '../models/Station';

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

  LOG && LOG('[Script] Finished!');
}

run();