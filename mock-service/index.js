const express = require('express');
const routes = require('./routes');

const app = express();
app.use(express.json());

app.use('/', routes);

const PORT = 8090;
app.listen(PORT, () => {
  console.log(`Mock service listening on ${PORT}`);
});