const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');
const { seed } = require('../src/seed');

let aliceToken;
let bobToken;

beforeAll(async () => {
  await seed();

  const aliceLogin = await request(app)
    .post('/login')
    .send({ email: 'alice@example.com', password: 'alicepwd' });
  aliceToken = aliceLogin.body.token;

  const bobLogin = await request(app)
    .post('/login')
    .send({ email: 'bob@example.com', password: 'bobpwd' });
  bobToken = bobLogin.body.token;
});

afterAll(async () => {
  delete process.env.FAKE_NOW;
  await db.close();
});

describe('Notes Authentication Middleware', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/notes');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 401 when token is invalid', async () => {
    const res = await request(app)
      .get('/notes')
      .set('Authorization', 'Bearer invalid.token.value');
    expect(res.statusCode).toBe(401);
  });
});

describe('Notes CRUD Operations', () => {
  let createdNoteId;

  it('GET /notes returns an array of notes for authenticated user', async () => {
    const res = await request(app)
      .get('/notes')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /notes rejects request with missing title or content with 400', async () => {
    const res1 = await request(app)
      .post('/notes')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ content: 'Only content' });
    expect(res1.statusCode).toBe(400);

    const res2 = await request(app)
      .post('/notes')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: 'Only title' });
    expect(res2.statusCode).toBe(400);

    const res3 = await request(app)
      .post('/notes')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: '   ', content: 'content' });
    expect(res3.statusCode).toBe(400);
  });

  it('POST /notes creates a new note successfully (201)', async () => {
    const res = await request(app)
      .post('/notes')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: 'Alice First Note', content: 'Hello Alice World' });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Alice First Note');
    expect(res.body.content).toBe('Hello Alice World');
    expect(res.body).toHaveProperty('created_at');
    expect(res.body).toHaveProperty('updated_at');

    // Verify ISO-8601 timestamp format
    expect(new Date(res.body.created_at).toISOString()).toBe(res.body.created_at);
    expect(new Date(res.body.updated_at).toISOString()).toBe(res.body.updated_at);

    createdNoteId = res.body.id;
  });

  it('GET /notes returns the created note in the user notes list', async () => {
    const res = await request(app)
      .get('/notes')
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((n) => n.id === createdNoteId);
    expect(found).toBeDefined();
    expect(found.title).toBe('Alice First Note');
  });

  it('GET /notes/:id returns the single note for its owner', async () => {
    const res = await request(app)
      .get(`/notes/${createdNoteId}`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(createdNoteId);
    expect(res.body.title).toBe('Alice First Note');
    expect(res.body.content).toBe('Hello Alice World');
  });

  it('GET /notes/:id returns 404 for a non-existent note', async () => {
    const res = await request(app)
      .get('/notes/999999')
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.statusCode).toBe(404);
  });

  it('GET /notes/:id returns 400 for an invalid ID format', async () => {
    const res = await request(app)
      .get('/notes/not-a-number')
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.statusCode).toBe(400);
  });

  it('PUT /notes/:id updates title and/or content of an owned note', async () => {
    const res = await request(app)
      .put(`/notes/${createdNoteId}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: 'Alice Updated Note', content: 'Updated content' });

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(createdNoteId);
    expect(res.body.title).toBe('Alice Updated Note');
    expect(res.body.content).toBe('Updated content');
    expect(new Date(res.body.updated_at).toISOString()).toBe(res.body.updated_at);
  });

  it('PUT /notes/:id rejects updates with empty body or invalid fields with 400', async () => {
    const res1 = await request(app)
      .put(`/notes/${createdNoteId}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({});
    expect(res1.statusCode).toBe(400);

    const res2 = await request(app)
      .put(`/notes/${createdNoteId}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: '   ' });
    expect(res2.statusCode).toBe(400);
  });
});

describe('Multi-user Access Control & Isolation', () => {
  let aliceNoteId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/notes')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: 'Alice Secret', content: 'Private data' });
    aliceNoteId = res.body.id;
  });

  it('Bob cannot see Alice note in his notes list', async () => {
    const res = await request(app)
      .get('/notes')
      .set('Authorization', `Bearer ${bobToken}`);

    expect(res.statusCode).toBe(200);
    const found = res.body.find((n) => n.id === aliceNoteId);
    expect(found).toBeUndefined();
  });

  it('Bob receives 403 Forbidden when attempting GET on Alice note', async () => {
    const res = await request(app)
      .get(`/notes/${aliceNoteId}`)
      .set('Authorization', `Bearer ${bobToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  it('Bob receives 403 Forbidden when attempting PUT on Alice note', async () => {
    const res = await request(app)
      .put(`/notes/${aliceNoteId}`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ title: 'Hacked by Bob' });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  it('Bob receives 403 Forbidden when attempting DELETE on Alice note', async () => {
    const res = await request(app)
      .delete(`/notes/${aliceNoteId}`)
      .set('Authorization', `Bearer ${bobToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  it('Alice can successfully delete her own note', async () => {
    const res = await request(app)
      .delete(`/notes/${aliceNoteId}`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.statusCode).toBe(200);

    // Verify it is no longer found
    const getRes = await request(app)
      .get(`/notes/${aliceNoteId}`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(getRes.statusCode).toBe(404);
  });
});

describe('Time Handling & FAKE_NOW', () => {
  const fakeTime = '2025-06-15T12:00:00.000Z';

  beforeEach(() => {
    process.env.FAKE_NOW = fakeTime;
  });

  afterEach(() => {
    delete process.env.FAKE_NOW;
  });

  it('uses FAKE_NOW timestamp when creating a note', async () => {
    const res = await request(app)
      .post('/notes')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: 'Timed Note', content: 'Created at fake time' });

    expect(res.statusCode).toBe(201);
    expect(res.body.created_at).toBe(fakeTime);
    expect(res.body.updated_at).toBe(fakeTime);
  });

  it('uses FAKE_NOW timestamp when updating a note', async () => {
    const createRes = await request(app)
      .post('/notes')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: 'Before update', content: 'Content' });

    const updatedFakeTime = '2025-06-15T13:30:00.000Z';
    process.env.FAKE_NOW = updatedFakeTime;

    const updateRes = await request(app)
      .put(`/notes/${createRes.body.id}`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: 'After update' });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.updated_at).toBe(updatedFakeTime);
  });
});

describe('Concurrency & Data Integrity', () => {
  it('handles parallel creation requests safely', async () => {
    const requests = Array.from({ length: 5 }, (_, i) =>
      request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ title: `Parallel Note ${i}`, content: `Content ${i}` })
    );

    const responses = await Promise.all(requests);
    responses.forEach((res) => {
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
    });
  });

  it('deduplicates simultaneous identical requests', async () => {
    const identicalPayload = { title: 'Dedupe Note', content: 'Identical Content' };
    const requests = Array.from({ length: 3 }, () =>
      request(app)
        .post('/notes')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send(identicalPayload)
    );

    const responses = await Promise.all(requests);
    responses.forEach((res) => {
      expect([200, 201]).toContain(res.statusCode);
      expect(res.body).toHaveProperty('id');
    });

    // Verify IDs match (deduplicated)
    const firstId = responses[0].body.id;
    responses.forEach((res) => {
      expect(res.body.id).toBe(firstId);
    });
  });

  it('handles parallel updates to the same note without data corruption', async () => {
    const createRes = await request(app)
      .post('/notes')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ title: 'Concurrent Target', content: 'Initial' });

    const noteId = createRes.body.id;

    const updateRequests = Array.from({ length: 4 }, (_, i) =>
      request(app)
        .put(`/notes/${noteId}`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ content: `Update version ${i}` })
    );

    const responses = await Promise.all(updateRequests);
    responses.forEach((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(noteId);
    });

    // Check final state
    const finalRes = await request(app)
      .get(`/notes/${noteId}`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(finalRes.statusCode).toBe(200);
    expect(finalRes.body.content).toMatch(/^Update version [0-3]$/);
  });
});
