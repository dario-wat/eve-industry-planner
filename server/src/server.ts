import 'reflect-metadata';
import 'dotenv/config';

import cors from 'cors';
import https from 'https';
import fs from 'fs';
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
import ScheduledJobsService from './core/schedule/ScheduledJobsService';

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
  const useHttps = process.env.USE_HTTPS_LOCAL === '1';

  initDatabase();

  // Needs to be called after database init
  const sequelize = Container.get(Sequelize);

  await connectToDatabase(sequelize);

  // Needs to be called after the database init
  console.log('Loading EVE SDE data');
  const sdeData = await EveSdeData.init();
  Container.set(EveSdeData, sdeData);
  console.log('Done loading EVE SDE data');

  const app = express();

  const sequelizeSessionStore = await initSessionStore(sequelize);
  app.use(session({
    secret: process.env.SESSION_SECRET!,
    store: sequelizeSessionStore,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: useHttps,
      maxAge: hoursToMilliseconds(7 * 24),
      sameSite: useHttps ? 'none' : undefined,
    },
  }))

  app.use(cookieParser());
  app.use(cors({
    origin: process.env.CLIENT_DOMAIN!,
    credentials: true,
  }));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // Enable trust for the X-Forwarded-Proto header
  // This is needed for AWS App Runner
  app.set('trust proxy', true);

  // Initialize all controllers.
  Container.get(Controllers).init(app);

  // Catch all errors
  process.on('unhandledRejection', (reason: string) => {
    console.error('Unhandled Promise Rejection:', reason);
  });

  Container.get(ScheduledJobsService).init();

  const port = process.env.PORT || process.env.SERVER_PORT!;
  if (useHttps) {
    const options = {
      key: fs.readFileSync('localhost.key'),
      cert: fs.readFileSync('localhost.crt'),
    };

    const serverHTTPS = https.createServer(options, app);
    serverHTTPS.listen(port, () => {
      console.log(`HTTPS server running at https://localhost:${port}/`);
    });
  } else {
    app.listen(port, () => {
      console.log(`API server listening on port ${port}`);
    });
  }
}

init();