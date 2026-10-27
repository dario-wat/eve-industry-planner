/* eslint-disable @typescript-eslint/no-explicit-any */

/*
 * This script will read yaml files from SDE (not all, but only the ones
 * specified in this script) and store them into the database. Only some
 * fields will be stored (again the ones defined in the scripts).
 *
 * DB tables are meant to exactly reflect SDE data, so values are stored
 * raw with no normalization or defaults applied in this mapper.
 *
 * Note: some files may be quite large so it could take a while.
 * Run like this:
 * npm run load-sde
 *
 * No logs:
 * SDE_LOAD_QUIET=1 npm run load-sde
 */
import 'reflect-metadata';

import yaml from 'js-yaml';
import fs from 'fs';
import { styleText } from 'node:util';
import Container from 'typedi';
import { Sequelize } from 'sequelize';
import { Model, ModelStatic } from 'sequelize/types';
import { Group } from '../core/sde/models/Group';
import { Type } from '../core/sde/models/Type';
import { Category } from '../core/sde/models/Category';
import { Station } from '../core/sde/models/Station';
import { SolarSystem } from '../core/sde/models/SolarSystem';
import { Blueprint } from '../core/sde/models/Blueprint';
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
    'sde/types.yaml',
    ([key, value]: [string, any]) => ({
      id: key,
      group_id: value.groupID,
      name: value.name.en,
      meta_group_id: value.metaGroupID,
      published: value.published,
      market_group_id: value.marketGroupID,
      volume: value.volume,
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
    'sde/groups.yaml',
    ([key, value]: [string, any]) => ({
      id: key,
      category_id: value.categoryID,
      name: value.name.en,
    }),
    Group,
  );

  await loadDataToDatabase(
    'sde/categories.yaml',
    ([key, value]: [string, any]) => ({
      id: key,
      name: value.name.en,
    }),
    Category,
  );

  await loadDataToDatabase(
    'sde/mapSolarSystems.yaml',
    ([key, value]: [string, any]) => ({
      id: key,
      region_id: value.regionID,
    }),
    SolarSystem,
  );

  await loadDataToDatabase(
    'sde/npcStations.yaml',
    ([key, value]: [string, any]) => ({
      id: key,
      solar_system_id: value.solarSystemID,
    }),
    Station,
  );

  await loadDataToDatabase(
    'sde/blueprints.yaml',
    ([key, value]: [string, any]) => ({
      id: key,
      activities: value.activities ?? {},
    }),
    Blueprint,
  );

  logFile('SDE load complete');
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
