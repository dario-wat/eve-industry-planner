const express = require('express');
const app = express();
const port = 8080;

// TODO move this get call out
app.get('/sso_callback', (req, res) => {
  console.log(req.query.code);
  console.log(req.query.state);
  res.redirect('http://localhost:3000');
});

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});