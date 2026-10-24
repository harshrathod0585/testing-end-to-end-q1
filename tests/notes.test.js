const request = require('supertest');
const app = require('../src/app');

let token;

beforeAll(async () => {
  const res = await request(app)
    .post('/login')
    .send({ email: 'bob@example.com', password: 'bobpwd' });
  token = res.body.token;
});

describe('Notes CRUD placeholders', () => {
  test('GET /notes returns 501', async () => {
    const res = await request(app)
      .get('/notes')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(501);
  });
});