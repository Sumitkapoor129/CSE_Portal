import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { testApp as app } from './testApp';
import { User } from '../models/User';
import { OTP } from '../models/OTP';
import { RefreshToken } from '../models/RefreshToken';
import bcrypt from 'bcryptjs';

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
  await Promise.all([
    User.deleteMany({}),
    OTP.deleteMany({}),
    RefreshToken.deleteMany({}),
  ]);
});

describe('Forgot and Reset Password Flow', () => {
  it('forgot-password: fails if email is missing or invalid', async () => {
    const res1 = await request(app).post('/api/auth/forgot-password').send({});
    expect(res1.status).toBe(400);
    expect(res1.body.fields?.email).toBeDefined();

    const res2 = await request(app).post('/api/auth/forgot-password').send({ email: 'notanemail' });
    expect(res2.status).toBe(400);
    expect(res2.body.fields?.email).toBeDefined();
  });

  it('forgot-password: fails with 404 if user not found', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'unknown@example.com' });
    expect(res.status).toBe(404);
    expect(res.body.message).toContain('No account found');
  });

  it('forgot-password: fails with 403 if user is inactive', async () => {
    await User.create({
      email: 'inactive@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Inactive User',
      role: 'student',
      isActive: false,
    });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'inactive@example.com' });
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('inactive');
  });

  it('forgot-password: sends OTP successfully for valid active user', async () => {
    await User.create({
      email: 'test@example.com',
      password: await bcrypt.hash('oldPassword123', 10),
      name: 'Test Student',
      role: 'student',
      isActive: true,
    });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.message).toContain('OTP has been sent');

    const otpDoc = await OTP.findOne({ email: 'test@example.com' });
    expect(otpDoc).toBeTruthy();
    expect(otpDoc?.verified).toBe(false);
  });

  it('reset-password: fails validation for missing or short password', async () => {
    const res1 = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'test@example.com', otp: '123456' });
    expect(res1.status).toBe(400);

    const res2 = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'test@example.com', otp: '123456', newPassword: '123' });
    expect(res2.status).toBe(400);
    expect(res2.body.fields?.newPassword).toBeDefined();
  });

  it('reset-password: rejects invalid or incorrect OTP', async () => {
    await User.create({
      email: 'test@example.com',
      password: await bcrypt.hash('oldPassword123', 10),
      name: 'Test Student',
      role: 'student',
      isActive: true,
    });

    // Create an OTP record with a known hashed code
    const hashedOtp = await bcrypt.hash('654321', 10);
    await OTP.create({
      email: 'test@example.com',
      otp: hashedOtp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      verified: false,
    });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({
        email: 'test@example.com',
        otp: '999999',
        newPassword: 'newSecretPassword123',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid or expired OTP');
  });

  it('reset-password: successfully updates password, invalidates refresh tokens, and allows login', async () => {
    const user = await User.create({
      email: 'resetme@example.com',
      password: await bcrypt.hash('oldPassword123', 10),
      name: 'Reset Student',
      role: 'student',
      isActive: true,
    });

    // Seed active refresh token
    await RefreshToken.create({
      user: user._id,
      tokenHash: 'someTokenHash123',
      expiresAt: new Date(Date.now() + 86400000),
    });

    // Create an OTP
    const plainOtp = '456789';
    const hashedOtp = await bcrypt.hash(plainOtp, 10);
    await OTP.create({
      email: 'resetme@example.com',
      otp: hashedOtp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      verified: false,
    });

    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        email: 'resetme@example.com',
        otp: plainOtp,
        newPassword: 'myBrandNewPassword123',
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);
    expect(resetRes.body.data?.message).toContain('Password reset successful');

    // Verify refresh tokens are cleared
    const remainingTokens = await RefreshToken.find({ user: user._id });
    expect(remainingTokens.length).toBe(0);

    // Old password should now fail
    const oldLoginRes = await request(app).post('/api/auth/login').send({
      email: 'resetme@example.com',
      password: 'oldPassword123',
    });
    expect(oldLoginRes.status).toBe(401);

    // New password should succeed
    const newLoginRes = await request(app).post('/api/auth/login').send({
      email: 'resetme@example.com',
      password: 'myBrandNewPassword123',
    });
    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body.data?.accessToken).toBeDefined();
  });
});
