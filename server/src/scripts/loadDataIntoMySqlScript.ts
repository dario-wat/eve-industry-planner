/*
* This script will read yaml files from SDE (not all, but only the ones
* specified in this script) and store them into the database. Only some
* fields will be stored (again the ones defined in the scripts).
*
* Note: some files may be quite large so it could take a while.
* Run like this:
* ts-node ./server/src/scripts/loadDataIntoMySqlScript.ts
*/

import { typeIdModelDefine } from '../models';
import { Sequelize, DataTypes } from 'sequelize';
import { parse } from 'yaml';
import fs from 'fs';

// const sequelize = new Sequelize(
//   'eve_industry_planner_db',
//   'root',
//   'KMkk%^FLt7%WyhHg8HcfMkShdH$tYw5Sq',
//   {
//     host: 'localhost',
//     port: 3306,
//     dialect: 'mysql'
//   }
// );

// typeIdModelDefine(sequelize);
// console.log(sequelize.models);

// \r\n'\r\n
// \r\n            '\r\n

const file = fs.readFileSync('sde/fsd/typeIDs.yaml', 'utf8')
// const file = fs.readFileSync('server/test.yaml', 'utf8');
// console.log(JSON.stringify(file));
const file2 = file
  .replaceAll("\r\n'\r\n", "\r\n            '\r\n")
  .replaceAll("\n'\n", "\n            '\n");
console.log('replaced all')
const res = parse(file2);
console.log(res);

// sequelize_fixtures.loadFile(
//   'sde/fsd/typeIDs.yaml',
//   [sequelize.models],
//   {
//     transformFixtureDataFn: function (data) {
//       console.log(data);
//       return data;
//     }
//   }
// );