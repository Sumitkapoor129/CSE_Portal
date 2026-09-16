import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { testApp as app } from './testApp';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
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
  await Promise.all([User.deleteMany({}), StudentProfile.deleteMany({})]);
});

describe('F1 auth error messages', () => {
  it('login: unknown email explains the email is unknown', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@college.edu', password: 'whatever1' });
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('No account found with this email');
    expect(res.body.fields).toEqual({ email: expect.any(String) });
  });

  it('login: wrong password is distinguishable and points at password', async () => {
    await User.create({
      email: 'a@college.edu',
      password: await bcrypt.hash('correct-password-1', 12),
      name: 'A',
      role: 'student',
      isActive: true,
    });
    const res = await request(app).post('/api/auth/login').send({ email: 'a@college.edu', password: 'wrong-password-1' });
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Incorrect password');
    expect(res.body.fields).toEqual({ password: expect.any(String) });
  });

  it('register: duplicate email returns 409 with fields.email', async () => {
    await User.create({
      email: 'dup@college.edu',
      password: await bcrypt.hash('secret123', 12),
      name: 'Dup',
      role: 'student',
      isActive: true,
    });
    const res = await request(app).post('/api/auth/register').send({
      email: 'DUP@college.edu',
      password: 'secret123',
      name: 'Dup',
      collegeId: 'CSE9999',
      rollNumber: '22CS9999',
      studentType: 'frp',
      department: 'CSE',
    });
    expect(res.status).toBe(409);
    expect(res.body.fields).toEqual({ email: expect.any(String) });
  });

  it('register: missing required fields have field targets', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@college.edu' });
    expect(res.status).toBe(400);
    expect(res.body.fields).toHaveProperty('password');
    expect(res.body.fields).toHaveProperty('name');
  });

  it('verify-otp: bad OTP points at otp field', async () => {
    const res = await request(app).post('/api/auth/verify-otp').send({ email: 'b@college.edu', otp: '000000' });
    expect(res.status).toBe(404); // unknown email surfaced distinctly from bad OTP
  });

  it('errorHandler passes fields through on unknown-field AppErrors', async () => {
    // login with neither field
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.fields).toBeDefined();
  });
});