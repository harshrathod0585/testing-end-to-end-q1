const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');
const { seed } = require('../src/seed');

beforeAll(async () => {
  await seed();
});

afterAll(async () => {
  await db.close();
});

describe('Health endpoint', () => {
  it('GET /health returns 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('Authentication', () => {
  it('logs in with seeded user (alice)', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'alice@example.com', password: 'alicepwd' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
  });

  it('logs in with seeded user (bob)', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'bob@example.com', password: 'bobpwd' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'alice@example.com', password: 'wrong' });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects non-existent user', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'nonexistent@example.com', password: 'pwd' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects missing email or password with 400', async () => {
    const res1 = await request(app)
      .post('/login')
      .send({ email: 'alice@example.com' });
    expect(res1.statusCode).toBe(400);

    const res2 = await request(app)
      .post('/login')
      .send({ password: 'alicepwd' });
    expect(res2.statusCode).toBe(400);

    const res3 = await request(app)
      .post('/login')
      .send({});
    expect(res3.statusCode).toBe(400);
  });
});

describe('User Registration', () => {
  const newEmail = `user_${Date.now()}@example.com`;

  it('registers a new user and returns a token', async () => {
    const res = await request(app)
      .post('/register')
      .send({ email: newEmail, password: 'password123' });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(newEmail);
  });

  it('logs in with newly registered user', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: newEmail, password: 'password123' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('rejects duplicate email with 409', async () => {
    const res = await request(app)
      .post('/register')
      .send({ email: newEmail, password: 'differentPassword' });

    expect(res.statusCode).toBe(409);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects invalid or missing email/password with 400', async () => {
    const res1 = await request(app)
      .post('/register')
      .send({ email: 'invalid-email', password: 'validpassword' });
    expect(res1.statusCode).toBe(400);

    const res2 = await request(app)
      .post('/register')
      .send({ email: '', password: 'validpassword' });
    expect(res2.statusCode).toBe(400);

    const res3 = await request(app)
      .post('/register')
      .send({ email: 'valid@example.com', password: '' });
    expect(res3.statusCode).toBe(400);
  });
});
