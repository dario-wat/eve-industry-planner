import 'reflect-metadata';

import cors from 'cors';
import express from 'express';
import { Sequelize } from 'sequelize/types';
import Container from 'typedi';
import initEveLoginController from './controllers/eveLoginController';
import initEveFetchDataController from './controllers/eveFetchDataController';
import initPlannedProductController from './controllers/plannedProductController';
import { initDatabase } from './loaders/initDatabase';
import { DIKeys } from './lib/DIKeys';

async function init() {
  initDatabase();
  const sequelize: Sequelize = Container.get(DIKeys.DB);

  // TODO maybe put this into database init
  await sequelize.authenticate().then(() => {
    console.log('Connected to MySQL.');
  }).catch((error) => {
    console.error('Unable to connect to the database: ', error);
  });
  await sequelize.sync({ alter: true });

  const app = express();
  app.use(cors());
  const port = 8080;

  // TODO(EPI-4) We should use a loader for this
  // Initialize all controllers. 
  initEveLoginController(app);
  initEveFetchDataController(app);
  initPlannedProductController(app);

  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });
}

init();