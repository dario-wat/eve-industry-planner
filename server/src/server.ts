import 'reflect-metadata';

import cors from 'cors';
import express from 'express';
import eveLoginController from './controllers/eveLoginController';
import { Container } from 'typedi';
import { DIKey } from './lib/DIKey';
import eveFetchDataController from './controllers/eveFetchDataController';

// TODO (hardcoded for now)
const characterId = 1384661776;
Container.set(DIKey.CHARACTER_ID, characterId);

const app = express();
app.use(cors());
const port = 8080;

eveLoginController(app);
eveFetchDataController(app);

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});