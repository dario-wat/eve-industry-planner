import 'reflect-metadata';

import cors from 'cors';
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { Sequelize } from 'sequelize';
import Container from 'typedi';
import { initDatabase } from './loaders/initDatabase';
import { initControllers } from './loaders/initControllers';
import EveSdeData from './services/query/EveSdeData';
import { hoursToMilliseconds } from 'date-fns';
import initSessionStore from './loaders/initSessionStore';

const port = 8080;
const domain = 'http://localhost:3000';

async function connectToDatabase(
  sequelize: Sequelize,
): Promise<void> {
  // TODO maybe put this into database init
  await sequelize.authenticate().then(() => {
    console.log('Connected to MySQL.');
  }).catch((error) => {
    console.error('Unable to connect to the database: ', error);
  });
  await sequelize.sync({ alter: true });
}

// TODO figure out how to properly organize Container sets at the beginning
async function init() {
  initDatabase();
  // TODO do I need this
  const sequelize = Container.get(Sequelize);

  await connectToDatabase(sequelize);

  // Needs to be called after the database init
  const sdeData = await EveSdeData.init();
  Container.set(EveSdeData, sdeData);

  const app = express();

  const sequelizeSessionStore = await initSessionStore(sequelize);
  app.use(session({
    secret: 'keyboard cat',
    store: sequelizeSessionStore,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: hoursToMilliseconds(24) },
  }))

  app.use(cookieParser());
  app.use(cors({
    origin: domain,
    credentials: true,
  }));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // Initialize all controllers. 
  initControllers(app);

  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });
}

init();