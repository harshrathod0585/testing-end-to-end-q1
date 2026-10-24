const express = require('express');
const { port } = require('./config');
const authRouter = require('./routes/auth');
const notesRouter = require('./routes/notes');

const app = express();

app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Auth routes
app.use('/login', authRouter);

// Notes routes
app.use('/notes', notesRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'not found' });
});

module.exports = app;