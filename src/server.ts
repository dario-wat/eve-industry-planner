import cors from 'cors';
import ESI from 'eve-esi-client';
import { CLIENT_ID, SECRET, CALLBACK_URI, SSO_STATE } from './lib/eve_sso/EveSsoConfig';
import MemoryProvider from 'eve-esi-client/dist/providers/memory';
import { eveScopes, industryJobsScope } from './lib/eve_sso/eveScopes';
import express from 'express';
import eveLoginController from './controllers/eveLoginController';

// TODO (hardcoded for now)
const characterId = 1384661776;

const app = express();
app.use(cors());
const port = 8080;

const provider = new MemoryProvider();

eveLoginController(app, provider);

const esi = new ESI({
  provider,
  clientId: CLIENT_ID,
  secretKey: SECRET,
  callbackUri: CALLBACK_URI,
});

app.get('/bullshit', async (req, res) => {
  const token = await provider.getToken(characterId, industryJobsScope);
  console.log(token);
  const response = await esi.request(
    `/characters/${characterId}/industry/jobs/`,
    undefined,
    undefined,
    { token },
  );
  // const response = await esi.request(
  //   `/status/`,
  //   undefined,
  //   undefined,
  //   { token },
  // );
  const stuff = await response.json();
  console.log(stuff);
  console.log('bullshit');
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});