const app = require('./app');
const { port } = require('./config');

app.listen(port, () => {
  console.log(`🚀 API listening on http://0.0.0.0:${port}`);
});