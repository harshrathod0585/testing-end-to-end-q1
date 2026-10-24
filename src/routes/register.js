const express = require('express');
const router = express.Router();
const { query } = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');

// POST /register
router.post('/', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password.trim()) {
    return res.status(400).json({ error: 'email and password required' });
  }

  // Basic email pattern validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'valid email required' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'user already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [normalizedEmail, hash]
    );

    const user = result.rows[0];
    const token = jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: '1h' });

    return res.status(201).json({
      message: 'User registered successfully',
      user: { id: user.id, email: user.email },
      token,
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'user already exists' });
    }
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

module.exports = router;
