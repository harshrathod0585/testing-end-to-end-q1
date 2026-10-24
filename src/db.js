const { Pool } = require('pg');
const { dbUrl } = require('./config');

const pool = new Pool({
  connectionString: dbUrl,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};