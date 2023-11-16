import 'reflect-metadata';
import 'dotenv/config';

import cors from 'cors';
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { Sequelize } from 'sequelize';
import Container from 'typedi';
import { initDatabase } from './loaders/initDatabase';
import Controllers from './loaders/Controllers';
import EveSdeData from './core/sde/EveSdeData';
import { hoursToMilliseconds } from 'date-fns';
import initSessionStore from './loaders/initSessionStore';
import { DOMAIN } from './const/ServerConst';

const port = 8080;
const domain = DOMAIN;
const sessionSecret = 'mcqbjEBpLRT0FgUBMI8d7qOHVfhM8WkYm0sKpHrO';

async function connectToDatabase(
  sequelize: Sequelize,
): Promise<void> {
  await sequelize.authenticate().then(() => {
    console.log('Connected to MySQL.');
  }).catch((error) => {
    console.error('Unable to connect to the database: ', error);
  });
  await sequelize.sync({ alter: true });
}

async function init() {
  initDatabase();

  // Needs to be called after database init
  const sequelize = Container.get(Sequelize);

  await connectToDatabase(sequelize);

  // Needs to be called after the database init
  const sdeData = await EveSdeData.init();
  Container.set(EveSdeData, sdeData);

  const app = express();

  const sequelizeSessionStore = await initSessionStore(sequelize);
  app.use(session({
    secret: sessionSecret,
    store: sequelizeSessionStore,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: hoursToMilliseconds(7 * 24) },
  }))

  app.use(cookieParser());
  app.use(cors({
    origin: domain,
    credentials: true,
  }));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // Initialize all controllers. 
  Container.get(Controllers).init(app);

  // Catch all errors
  process.on('unhandledRejection', (reason: string) => {
    console.error('Unhandled Promise Rejection:', reason);
  });

  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });
}

init();