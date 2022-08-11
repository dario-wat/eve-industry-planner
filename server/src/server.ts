import 'reflect-metadata';

import cors from 'cors';
import express from 'express';
import mysql from 'mysql';
import { Sequelize, DataTypes } from 'sequelize';
import initEveLoginController from './controllers/eveLoginController';
import initEveFetchDataController from './controllers/eveFetchDataController';
import { typeIdModelDefine } from './models';


const sequelize = new Sequelize(
  'eve_industry_planner_db',
  'root',
  'KMkk%^FLt7%WyhHg8HcfMkShdH$tYw5Sq',
  {
    host: 'localhost',
    port: 3306,
    dialect: 'mysql'
  }
);

sequelize.authenticate().then(() => {
  console.log('Connection has been established successfully.');
}).catch((error) => {
  console.error('Unable to connect to the database: ', error);
});

// TODO(EIP-5) we should use loaders for this
// Initialize all models.
typeIdModelDefine(sequelize);

sequelize.sync().then(() => {
  console.log('TypeID table created successfully!');
}).catch((error) => {
  console.error('Unable to create table : ', error);
});

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