const express = require('express');
const router = express.Router();

let calls = [];

// Record any incoming request
router.use((req, res, next) => {
  const { method, path, body, query } = req;
  calls.push({
    method,
    path,
    body,
    query,
    timestamp: new Date().toISOString(),
  });
  next();
});

// Simple ping endpoint
router.get('/ping', (req, res) => {
  res.json({ ok: true });
});

// Retrieve recorded calls
router.get('/_calls', (req, res) => {
  res.json(calls);
});

module.exports = router;