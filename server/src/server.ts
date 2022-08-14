import 'reflect-metadata';

import cors from 'cors';
import express from 'express';
import initEveLoginController from './controllers/eveLoginController';
import initEveFetchDataController from './controllers/eveFetchDataController';
import Container from 'typedi';
import SequelizeService from './services/SequelizeService';
import defineAllSequelizeModels from './loaders/defineAllSequelizeModels';

async function databaseInit() {
  // TODO(EIP-9) maybe should use the service instead of the getter
  const sequelize = Container.get(SequelizeService).getSequelize();

  await sequelize.authenticate().then(() => {
    console.log('Connected to MySQL.');
  }).catch((error) => {
    console.error('Unable to connect to the database: ', error);
  });

  defineAllSequelizeModels(sequelize);

  // await sequelize.sync().then(() => {
  //   console.log('Models synced with the database.');
  // }).catch((error) => {
  //   console.error('Unable to sync table: ', error);
  // });
}

async function init() {
  await databaseInit();

  const app = express();
  app.use(cors());
  const port = 8080;

  // TODO(EPI-4) We should use a loader for this
  // Initialize all controllers. 
  initEveLoginController(app);
  initEveFetchDataController(app);

  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });
}

init();