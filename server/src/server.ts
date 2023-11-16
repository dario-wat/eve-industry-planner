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

  console.log('1')

  const app = express();

  const sequelizeSessionStore = await initSessionStore(sequelize);
  app.use(session({
    secret: process.env.SESSION_SECRET!,
    store: sequelizeSessionStore,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: hoursToMilliseconds(7 * 24) },
  }))

  console.log('2')

  app.use(cookieParser());
  console.log('3')
  app.use(cors({
    origin: process.env.CLIENT_DOMAIN!,
    credentials: true,
  }));
  console.log('4')
  app.use(express.urlencoded({ extended: true }));
  console.log('5')
  app.use(express.json());

  console.log('6')

  // Initialize all controllers. 
  Container.get(Controllers).init(app);

  console.log('7')

  // Catch all errors
  process.on('unhandledRejection', (reason: string) => {
    console.error('Unhandled Promise Rejection:', reason);
  });

  console.log('8')

  const port = process.env.PORT || process.env.SERVER_PORT!;

  console.log('9')
  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });
}

init();