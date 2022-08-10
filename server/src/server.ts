import 'reflect-metadata';

import cors from 'cors';
import express from 'express';
import initEveLoginController from './controllers/eveLoginController';
import initEveFetchDataController from './controllers/eveFetchDataController';

const app = express();
app.use(cors());
const port = 8080;

initEveLoginController(app);
initEveFetchDataController(app);

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});