const { Pool } = require('pg');
const { dbUrl } = require('./config');

let pool;
let isMem = false;

function setMemoryPool() {
  const { newDb } = require('pg-mem');
  const db = newDb();
  const { Pool: MemPool } = db.adapters.createPg();
  pool = new MemPool();
  isMem = true;
  return pool;
}

if ((process.env.NODE_ENV === 'test' && !process.env.DATABASE_URL) || process.env.USE_IN_MEMORY_DB === 'true') {
  setMemoryPool();
} else {
  pool = new Pool({
    connectionString: dbUrl,
  });
}

async function query(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    if (process.env.NODE_ENV === 'test' && !isMem) {
      console.warn('PostgreSQL query error in test mode, falling back to in-memory db:', err.message);
      setMemoryPool();
      const { seed } = require('./seed');
      await seed();
      return await pool.query(text, params);
    }
    throw err;
  }
}

async function getClient() {
  try {
    return await pool.connect();
  } catch (err) {
    if (process.env.NODE_ENV === 'test' && !isMem) {
      console.warn('PostgreSQL client error in test mode, falling back to in-memory db:', err.message);
      setMemoryPool();
      const { seed } = require('./seed');
      await seed();
      return await pool.connect();
    }
    throw err;
  }
}

module.exports = {
  query,
  getClient,
  get pool() {
    return pool;
  },
  setMemoryPool,
  close: async () => {
    if (pool && typeof pool.end === 'function') {
      try {
        await pool.end();
      } catch (_) {}
    }
  },
};
