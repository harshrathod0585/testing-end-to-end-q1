require('dotenv').config();

module.exports = {
  port: process.env.PORT || 8080,
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  fakeNow: process.env.FAKE_NOW || null,
};