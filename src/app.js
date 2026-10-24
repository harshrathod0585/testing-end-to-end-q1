const express = require('express');
const authRouter = require('./routes/auth');
const registerRouter = require('./routes/register');
const notesRouter = require('./routes/notes');

const app = express();

app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Auth routes
app.use('/login', authRouter);
app.use('/register', registerRouter);

// Aliases under /auth
app.use('/auth/login', authRouter);
app.use('/auth/register', registerRouter);

// Notes routes
app.use('/notes', notesRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'not found' });
});

module.exports = app;
