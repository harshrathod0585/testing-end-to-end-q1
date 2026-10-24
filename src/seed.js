const bcrypt = require('bcrypt');
const { query } = require('./db');

async function createTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function insertUser(email, password) {
  const hash = await bcrypt.hash(password, 10);
  await query(
    `INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [email, hash]
  );
}

async function seed() {
  try {
    await createTables();
    await insertUser('alice@example.com', 'alicepwd');
    await insertUser('bob@example.com', 'bobpwd');
    console.log('✅ Seed data inserted');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed', err);
    process.exit(1);
  }
}

seed();