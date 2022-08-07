import express from 'express';
import EveLoginUrlController from './controllers/EveLoginUrlController';

// console.log(bs);

const app = express();
const port = 8080;

EveLoginUrlController(app);


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