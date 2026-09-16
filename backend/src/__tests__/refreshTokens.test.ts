import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import { testApp as app } from './testApp';
import { User } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

afterEach(async () => {
  await User.deleteMany({});
  await RefreshToken.deleteMany({});
});

async function makeUser(overrides: Record<string, unknown> = {}) {
  return User.create({
    email: 'rt@college.edu',
    password: await bcrypt.hash('secret123', 12),
    name: 'RT',
    role: 'student',
    isActive: true,
    ...overrides,
  });
}

const login = async () => {
  const res = await request(app).post('/api/auth/login').send({ email: 'rt@college.edu', password: 'secret123' });
  return res.body.data as { accessToken: string; refreshToken: string; user: { id: string; role: string; email: string } };
};

describe('F8 refresh tokens', () => {
  it('login returns accessToken + refreshToken', async () => {
    await makeUser();
    const data = await login();
    expect(data.accessToken).toBeTruthy();
    expect(data.refreshToken).toBeTruthy();
    expect(data.user.role).toBe('student');
  });

  it('refresh rotates: old refresh token is invalid after use', async () => {
    await makeUser();
    const { accessToken } = await login();
    // access token works on /me
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${accessToken}`);
    expect(me.status).toBe(200);

    const first = await login();
    const refreshed = await request(app).post('/api/auth/refresh').send({ refreshToken: first.refreshToken });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeTruthy();

    const replay = await request(app).post('/api/auth/refresh').send({ refreshToken: first.refreshToken });
    expect(replay.status).toBe(401);
  });

  it('logout invalidates the refresh token', async () => {
    await makeUser();
    const { refreshToken } = await login();
    const out = await request(app).post('/api/auth/logout').send({ refreshToken });
    expect(out.status).toBe(200);
    const nue = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(nue.status).toBe(401);
  });

  it('a refresh token is not accepted as an access token', async () => {
    await makeUser();
    const { refreshToken } = await login();
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${refreshToken}`);
    expect(me.status).toBe(401);
  });

  it('a deactivated user cannot refresh their token', async () => {
    await makeUser();
    const { refreshToken: rt } = await login();

    const user = await User.findOne({ email: 'rt@college.edu' });
    user!.isActive = false;
    await user!.save();

    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: rt });
    expect(res.status).toBe(401);

    const session = await RefreshToken.findOne({ tokenHash: { $exists: true } });
    expect(session).toBeNull();
  });
});