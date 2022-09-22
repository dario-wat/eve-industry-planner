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

const SequelizeStore = require("connect-session-sequelize")(session.Store);

declare module 'express-session' {
  interface SessionData {
    characterId: number;
    characterName: string;
  }
}

// TODO figure out how to properly organize Container sets at the beginning
async function init() {
  initDatabase();
  // TODO do I need this
  const sequelize = Container.get(Sequelize);

  // TODO maybe put this into database init
  await sequelize.authenticate().then(() => {
    console.log('Connected to MySQL.');
  }).catch((error) => {
    console.error('Unable to connect to the database: ', error);
  });
  await sequelize.sync({ alter: true });

  // Needs to be called after the database init
  const sdeData = await EveSdeData.init();
  Container.set(EveSdeData, sdeData);

  const app = express();

  const sequelizeSessionStore = new SequelizeStore({
    db: sequelize,
  });
  app.use(session({
    secret: 'keyboard cat',
    store: sequelizeSessionStore,
    // TODO something about below booleans breaks resetting the coookie
    resave: false,
    // rolling: true,
    saveUninitialized: true,
    // TODO might need to be false to update the cookie
    cookie: { secure: false, maxAge: hoursToMilliseconds(24) },
  }))
  await sequelizeSessionStore.sync();

  app.use(cookieParser());
  app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
  }));
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