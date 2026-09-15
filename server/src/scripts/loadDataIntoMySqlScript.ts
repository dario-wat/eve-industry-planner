/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * This script will read yaml files from SDE (not all, but only the ones
 * specified in this script) and store them into the database. Only some
 * fields will be stored (again the ones defined in the scripts).
 *
 * Note: some files may be quite large so it could take a while.
 * Run like this:
 * ts-node ./server/src/scripts/loadDataIntoMySqlScript.ts
 *
 * No logs:
 * SDE_LOAD_QUIET=1 ts-node ./server/src/scripts/loadDataIntoMySqlScript.ts
 */
import 'reflect-metadata';

import yaml from 'js-yaml';
import fs from 'fs';
import { styleText } from 'node:util';
import Container from 'typedi';
import { Sequelize } from 'sequelize';
import { Model, ModelStatic } from 'sequelize/types';
import { Group } from '../core/sde/models/Group';
import { Icon } from '../core/sde/models/Icon';
import { Type } from '../core/sde/models/Type';
import { Category } from '../core/sde/models/Category';
import { Station } from '../core/sde/models/Station';
import { SolarSystem } from '../core/sde/models/SolarSystem';
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

const SEQUELIZE_LOG = false;
const loggingEnabled = process.env.SDE_LOAD_QUIET !== '1';

function logFile(label: string): void {
  if (!loggingEnabled) return;
  console.log(styleText('cyan', label));
}

function logFileEnd(): void {
  if (!loggingEnabled) return;
  console.log('');
}

/** Phases for one file/section, printed on a single indented line (read · parse · insert). */
function createPhaseLine(): { step: (phase: string) => void; end: () => void } {
  let open = false;

  return {
    step(phase: string): void {
      if (!loggingEnabled) return;
      const chunk = open ? ` · ${phase}` : `  ${phase}`;
      open = true;
      process.stdout.write(styleText('white', chunk));
    },
    end(): void {
      if (!loggingEnabled || !open) return;
      process.stdout.write('\n');
      open = false;
    },
  };
}

async function loadDataToDatabase<MS extends ModelStatic<Model>>(
  fileName: string,
  transformFn: ([keyof, value]: [string, any]) => any,
  model: MS,
  options?: {
    cleanupInputFn?: ((inString: string) => string) | undefined;
  },
) {
  const phases = createPhaseLine();
  logFile(fileName);

  phases.step('read');
  const fileContent = fs.readFileSync(fileName, 'utf8');

  let yamlInput = fileContent;
  if (options?.cleanupInputFn) {
    phases.step('cleanup');
    yamlInput = options.cleanupInputFn(fileContent);
  }

  phases.step('parse');
  const result: any = yaml.load(yamlInput);

  phases.step('transform');
  const records = Object.entries(result).map(transformFn);

  phases.step('insert');
  await model.bulkCreate(records, { logging: SEQUELIZE_LOG });

  phases.end();
  logFileEnd();
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
    [BpCopyingMaterials.name]: (value.activities.copying?.materials ?? []).map(materialMapper),
    [BpInventionMaterials.name]: (value.activities.invention?.materials ?? []).map(materialMapper),
    [BpManufacturingMaterials.name]: (value.activities.manufacturing?.materials ?? []).map(
      materialMapper,
    ),
    [BpReactionMaterials.name]: (value.activities.reaction?.materials ?? []).map(materialMapper),
    [BpMeMaterials.name]: (value.activities.research_material?.materials ?? []).map(materialMapper),
    [BpTeMaterials.name]: (value.activities.research_time?.materials ?? []).map(materialMapper),
    [BpInventionProducts.name]: (value.activities.invention?.products ?? []).map(materialMapper),
    [BpManufacturingProducts.name]: (value.activities.manufacturing?.products ?? []).map(
      materialMapper,
    ),
    [BpReactionProducts.name]: (value.activities.reaction?.products ?? []).map(materialMapper),
  };
}

async function loadBlueprintData() {
  const fileName = 'sde2/blueprints.yaml';
  const phases = createPhaseLine();
  logFile(fileName);

  phases.step('read');
  const fileContent = fs.readFileSync(fileName, 'utf8');

  phases.step('parse');
  const result: any = yaml.load(fileContent);

  phases.step('transform');
  const records = Object.entries(result).map(extractBlueprintData);

  phases.step('insert');
  await Blueprint.bulkCreate(
    records.map((o: any) => o[Blueprint.name]),
    { logging: SEQUELIZE_LOG },
  );

  const bulkCreateHelper = async <MS extends ModelStatic<Model>>(model: MS) =>
    await model.bulkCreate(records.map((o: any) => o[model.name]).flat(), {
      logging: SEQUELIZE_LOG,
    });

  await bulkCreateHelper(BpCopyingMaterials);
  await bulkCreateHelper(BpInventionMaterials);
  await bulkCreateHelper(BpManufacturingMaterials);
  await bulkCreateHelper(BpReactionMaterials);
  await bulkCreateHelper(BpMeMaterials);
  await bulkCreateHelper(BpTeMaterials);
  await bulkCreateHelper(BpInventionProducts);
  await bulkCreateHelper(BpManufacturingProducts);
  await bulkCreateHelper(BpReactionProducts);

  phases.end();
  logFileEnd();
}

async function run() {
  const setupPhases = createPhaseLine();
  logFile('SDE load');

  setupPhases.step('connect');
  initDatabaseForSdeScript();
  const sequelize = Container.get(Sequelize);
  await sequelize.authenticate({ logging: SEQUELIZE_LOG });

  setupPhases.step('sync');
  await sequelize.sync({ force: true, logging: SEQUELIZE_LOG });

  setupPhases.end();
  logFileEnd();

  await loadDataToDatabase(
    'sde2/types.yaml',
    ([key, value]: [string, any]) => ({
      id: key,
      group_id: value.groupID,
      name: value.name.en,
      meta_group_id: value.metaGroupID,
    }),
    Type,
    {
      cleanupInputFn: (inString: string) =>
        inString
          .replaceAll("\r\n'\r\n", "\r\n            '\r\n")
          .replaceAll("\n'\n", "\n            '\n"),
    },
  );

  await loadDataToDatabase(
    'sde2/groups.yaml',
    ([key, value]: [string, any]) => ({
      id: key,
      category_id: value.categoryID,
      icon_id: value.iconID,
      name: value.name.en,
    }),
    Group,
  );

  await loadDataToDatabase(
    'sde2/icons.yaml',
    ([key, value]: [string, any]) => ({
      id: key,
      icon_file: value.iconFile,
    }),
    Icon,
  );

  await loadDataToDatabase(
    'sde2/categories.yaml',
    ([key, value]: [string, any]) => ({
      id: key,
      name: value.name.en,
    }),
    Category,
  );

  await loadDataToDatabase(
    'sde2/mapSolarSystems.yaml',
    ([key, value]: [string, any]) => ({
      id: key,
      region_id: value.regionID,
    }),
    SolarSystem,
  );

  await loadDataToDatabase(
    'sde2/npcStations.yaml',
    ([key, value]: [string, any]) => ({
      id: key,
      solar_system_id: value.solarSystemID,
    }),
    Station,
  );

  await loadBlueprintData();

  logFile('SDE load complete');
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
