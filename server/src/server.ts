import 'reflect-metadata';

import cors from 'cors';
import express from 'express';
import { Sequelize } from 'sequelize/types';
import Container from 'typedi';
import { initDatabase } from './loaders/initDatabase';
import { DIKeys } from './const/DIKeys';
import { initControllers } from './loaders/initControllers';

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
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  const port = 8080;

  // Initialize all controllers. 
  initControllers(app);

  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });
}

init();