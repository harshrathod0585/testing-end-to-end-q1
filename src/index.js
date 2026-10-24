const app = require('./app');
const { port } = require('./config');
const { seed } = require('./seed');

async function start() {
  let retries = 15;
  while (retries > 0) {
    try {
      await seed();
      break;
    } catch (err) {
      retries -= 1;
      console.log(`Database not ready, retrying in 2 seconds... (${retries} retries left)`);
      if (retries === 0) {
        console.error('Failed to connect to database after multiple retries', err);
        process.exit(1);
      }
      await new Promise(res => setTimeout(res, 2000));
    }
  }

  app.listen(port, () => {
    console.log(`🚀 API listening on http://0.0.0.0:${port}`);
  });
}

start();
