import 'reflect-metadata';

import cors from 'cors';
import ESI from 'eve-esi-client';
import { CLIENT_ID, SECRET, CALLBACK_URI, SSO_STATE } from './eve_sso/EveSsoConfig';
import MemoryProvider from 'eve-esi-client/dist/providers/memory';
import express from 'express';
import eveLoginController from './controllers/eveLoginController';
import EsiProvider from './eve_sso/EsiProvider';
import { Container, Inject, Service, Token } from 'typedi';
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

const esi = EsiProvider.get();

// app.get('/bullshit', async (req, res) => {
//   const token = await provider.getToken(characterId, industryJobsScope);
//   console.log(token);
//   const response = await esi.request(
//     `/characters/${characterId}/industry/jobs/`,
//     undefined,
//     undefined,
//     { token },
//   );
//   // const response = await esi.request(
//   //   `/status/`,
//   //   undefined,
//   //   undefined,
//   //   { token },
//   // );
//   const stuff = await response.json();
//   console.log(stuff);
//   console.log('bullshit');
//   res.sendStatus(200);
// });

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});