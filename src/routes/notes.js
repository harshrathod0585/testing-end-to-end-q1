const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// GET /notes - list notes
router.get('/', async (req, res) => {
  // TODO: fetch notes belonging to req.user.id
  return res.status(501).json({ error: 'not implemented' });
});

// POST /notes - create note
router.post('/', async (req, res) => {
  // TODO: create a note for req.user.id
  return res.status(501).json({ error: 'not implemented' });
});

// GET /notes/:id - get single note
router.get('/:id', async (req, res) => {
  // TODO: fetch note by id, ensure it belongs to req.user.id
  return res.status(501).json({ error: 'not implemented' });
});

// PUT /notes/:id - update note
router.put('/:id', async (req, res) => {
  // TODO: update note if owned by req.user.id
  return res.status(501).json({ error: 'not implemented' });
});

// DELETE /notes/:id - delete note
router.delete('/:id', async (req, res) => {
  // TODO: delete note if owned by req.user.id
  return res.status(501).json({ error: 'not implemented' });
});

module.exports = router;