const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { query, getClient } = require('../db');

// All routes require authentication
router.use(auth);

function getNow() {
  const fakeNow = process.env.FAKE_NOW;
  if (fakeNow && fakeNow.trim() !== '') {
    const d = new Date(fakeNow);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  }
  return new Date().toISOString();
}

function formatNote(note) {
  if (!note) return null;
  return {
    id: note.id,
    user_id: note.user_id,
    title: note.title,
    content: note.content,
    created_at: new Date(note.created_at).toISOString(),
    updated_at: new Date(note.updated_at).toISOString(),
  };
}

// In-flight deduplication and idempotency tracking
const idempotencyCache = new Map();
const recentCreations = new Map();
const inFlightRequests = new Map();

// GET /notes - list notes belonging to authenticated user
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, user_id, title, content, created_at, updated_at FROM notes WHERE user_id = $1 ORDER BY id ASC',
      [req.user.id]
    );
    return res.json(result.rows.map(formatNote));
  } catch (err) {
    console.error('Error listing notes:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// POST /notes - create note
router.post('/', async (req, res) => {
  const { title, content } = req.body || {};
  if (
    title === undefined ||
    content === undefined ||
    typeof title !== 'string' ||
    typeof content !== 'string' ||
    title.trim() === ''
  ) {
    return res.status(400).json({ error: 'title and content are required' });
  }

  const trimmedTitle = title.trim();
  const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
  const dedupeKey = idempotencyKey
    ? `idem:${req.user.id}:${idempotencyKey}`
    : `user:${req.user.id}:${trimmedTitle}:${content}`;

  if (idempotencyKey && idempotencyCache.has(dedupeKey)) {
    return res.status(200).json(idempotencyCache.get(dedupeKey));
  }

  // Check recent identical creation within short window (handles near-simultaneous duplicate clicks)
  if (!idempotencyKey && recentCreations.has(dedupeKey)) {
    const recent = recentCreations.get(dedupeKey);
    if (Date.now() - recent.time < 5000) {
      return res.status(201).json(recent.note);
    }
  }

  if (inFlightRequests.has(dedupeKey)) {
    try {
      const existing = await inFlightRequests.get(dedupeKey);
      return res.status(201).json(existing);
    } catch (_) {
      // In case of prior failure, continue below
    }
  }

  let resolveCreation;
  let rejectCreation;
  const creationPromise = new Promise((resolve, reject) => {
    resolveCreation = resolve;
    rejectCreation = reject;
  });

  inFlightRequests.set(dedupeKey, creationPromise);

  try {
    const now = getNow();
    const result = await query(
      `INSERT INTO notes (user_id, title, content, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $4)
       RETURNING id, user_id, title, content, created_at, updated_at`,
      [req.user.id, trimmedTitle, content, now]
    );
    const createdNote = formatNote(result.rows[0]);

    if (idempotencyKey) {
      idempotencyCache.set(dedupeKey, createdNote);
      setTimeout(() => idempotencyCache.delete(dedupeKey), 10 * 60 * 1000).unref();
    } else {
      recentCreations.set(dedupeKey, { note: createdNote, time: Date.now() });
      setTimeout(() => recentCreations.delete(dedupeKey), 5000).unref();
    }

    resolveCreation(createdNote);
    return res.status(201).json(createdNote);
  } catch (err) {
    rejectCreation(err);
    console.error('Error creating note:', err);
    return res.status(500).json({ error: 'internal error' });
  } finally {
    inFlightRequests.delete(dedupeKey);
  }
});

// GET /notes/:id - get single note
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid note ID' });
  }

  try {
    const result = await query(
      'SELECT id, user_id, title, content, created_at, updated_at FROM notes WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const note = result.rows[0];
    if (note.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this note' });
    }

    return res.json(formatNote(note));
  } catch (err) {
    console.error('Error fetching note:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// PUT /notes/:id - update note
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid note ID' });
  }

  const { title, content } = req.body || {};
  if (title === undefined && content === undefined) {
    return res.status(400).json({ error: 'title or content must be provided' });
  }

  if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
    return res.status(400).json({ error: 'title must be a non-empty string' });
  }

  if (content !== undefined && typeof content !== 'string') {
    return res.status(400).json({ error: 'content must be a string' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const existingRes = await client.query('SELECT * FROM notes WHERE id = $1 FOR UPDATE', [id]);
    if (existingRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Note not found' });
    }

    const note = existingRes.rows[0];
    if (note.user_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Forbidden: You do not have access to this note' });
    }

    const newTitle = title !== undefined ? title.trim() : note.title;
    const newContent = content !== undefined ? content : note.content;
    const now = getNow();

    const updateRes = await client.query(
      `UPDATE notes
       SET title = $1, content = $2, updated_at = $3
       WHERE id = $4
       RETURNING id, user_id, title, content, created_at, updated_at`,
      [newTitle, newContent, now, id]
    );

    await client.query('COMMIT');
    return res.json(formatNote(updateRes.rows[0]));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error updating note:', err);
    return res.status(500).json({ error: 'internal error' });
  } finally {
    client.release();
  }
});

// DELETE /notes/:id - delete note
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid note ID' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const existingRes = await client.query('SELECT * FROM notes WHERE id = $1 FOR UPDATE', [id]);
    if (existingRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Note not found' });
    }

    const note = existingRes.rows[0];
    if (note.user_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Forbidden: You do not have access to this note' });
    }

    await client.query('DELETE FROM notes WHERE id = $1', [id]);
    await client.query('COMMIT');
    return res.status(200).json({ message: 'Note deleted successfully', id });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error deleting note:', err);
    return res.status(500).json({ error: 'internal error' });
  } finally {
    client.release();
  }
});

module.exports = router;
