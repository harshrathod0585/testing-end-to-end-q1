const request = require('supertest');
const app = require('../src/app');

describe('Authentication', () => {
  it('logs in with seeded user', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'alice@example.com', password: 'alicepwd' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'alice@example.com', password: 'wrong' });
    expect(res.statusCode).toBe(401);
  });
});