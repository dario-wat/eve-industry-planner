import cors from 'cors';
import express from 'express';
import eveLoginController from './controllers/eveLoginController';

const app = express();
app.use(cors());
const port = 8080;

eveLoginController(app);

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});