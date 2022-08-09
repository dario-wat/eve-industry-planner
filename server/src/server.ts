import 'reflect-metadata';

import cors from 'cors';
import MemoryProvider from 'eve-esi-client/dist/providers/memory';
import express from 'express';
import eveLoginController from './controllers/eveLoginController';
import EsiProvider from './lib/eve_sso/EsiProvider';
import { Container } from 'typedi';
import { DIKey } from './lib/DIKey';
import eveFetchDataController from './controllers/eveFetchDataController';

// TODO (hardcoded for now)
const characterId = 1384661776;
Container.set(DIKey.CHARACTER_ID, characterId);

const app = express();
app.use(cors());
const port = 8080;

const provider = new MemoryProvider();


// TODO maybe this should be a DI
EsiProvider.init(provider);

eveLoginController(app);
eveFetchDataController(app, provider);

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});