/*
* This script will read yaml files from SDE (not all, but only the ones
* specified in this script) and store them into the database. Only some
* fields will be stored (again the ones defined in the scripts).
*
* Note: some files may be quite large so it could take a while.
* Run like this:
* ts-node ./server/src/scripts/loadDataIntoMySqlScript.ts
*/
import 'reflect-metadata';

import { typeIdModelDefine } from '../models';
import { parse } from 'yaml';
import fs from 'fs';
import Container from 'typedi';
import SequelizeService from '../services/SequelizeService';

const sequelize = Container.get(SequelizeService).get();
console.log('Dropping all tables ...');
sequelize.drop();
sequelize.sync({ logging: false });

console.log('Reading file ...');
const fileContent = fs.readFileSync('sde/fsd/typeIDs.yaml', 'utf8');

console.log('Cleaning content ...');
const cleanContent = fileContent
  .replaceAll("\r\n'\r\n", "\r\n            '\r\n")
  .replaceAll("\n'\n", "\n            '\n");

console.log('Parsing YAML ...');
const res = parse(cleanContent);

const records = Object.entries(res).map(
  ([key, value]: [string, any]) => ({ id: key, group_id: value.groupID, name: value.name.en })
);
const model = typeIdModelDefine(sequelize);
console.log('Storing into the database ...');
model.bulkCreate(records);

console.log('Finished!');