const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  const token = auth.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    const payload = jwt.verify(token, jwtSecret);
    if (!payload || payload.sub === undefined || payload.sub === null) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = { id: parseInt(payload.sub, 10) };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authMiddleware;
