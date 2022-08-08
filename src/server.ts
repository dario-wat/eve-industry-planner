import cors from 'cors';
import express from 'express';
import MemoryProvider from 'eve-esi-client/dist/providers/memory';
import eveLoginController from './controllers/eveLoginController';

const app = express();
app.use(cors());
const port = 8080;

const provider = new MemoryProvider();

eveLoginController(app, provider);

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});