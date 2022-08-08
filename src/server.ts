import cors from 'cors';
import express from 'express';
import eveLoginUrlController from './controllers/eveLoginUrlController';

const app = express();
app.use(cors());
const port = 8080;

eveLoginUrlController(app);


// TODO move this get call out
app.get('/sso_callback', (req, res) => {
  console.log(req.query.code);
  console.log(req.query.state);
  // TODO make the post call here
  // TODO store access token
  res.redirect('http://localhost:3000');
});

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});