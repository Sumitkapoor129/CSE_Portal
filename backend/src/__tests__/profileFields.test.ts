import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { testApp as app } from './testApp';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

let token: string;
let profileId: string;

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), StudentProfile.deleteMany({})]);
  const user = await User.create({
    email: 'pf@college.edu', password: await bcrypt.hash('secret123', 12),
    name: 'PF', role: 'student', isActive: true,
  });
  const profile = await StudentProfile.create({
    user: user._id, collegeId: 'CSE6001', rollNumber: '22CS6001',
    studentType: 'frp', department: 'CSE', admissionDate: new Date(),
    requiredCredits: 12, isProfileComplete: false,
  });
  profileId = String(profile._id);
  const login = await request(app).post('/api/auth/login').send({ email: 'pf@college.edu', password: 'secret123' });
  token = login.body.data.accessToken;
});

describe('F7 profile fields', () => {
  it('PUT /student/profile persists the new fields and marks incomplete profile still incomplete', async () => {
    const res = await request(app).put('/api/student/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ researchArea: 'ML', bloodGroup: 'B+', phone: '9999999999' });
    expect(res.status).toBe(200);
    const stored = await StudentProfile.findById(profileId);
    expect(stored!.bloodGroup).toBe('B+');
    expect(stored!.phone).toBe('9999999999');
    expect(stored!.isProfileComplete).toBe(false);
  });

  it('completes the profile and assigns 12 credits for M.Tech', async () => {
    const res = await request(app).put('/api/student/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        researchArea: 'ML', phone: '9999999999', address: 'Jamshedpur',
        lastDegree: 'M.Tech', institution: 'NIT JSR', graduationYear: 2022,
        dateOfBirth: '2000-01-01',
      });
    expect(res.status).toBe(200);
    const stored = await StudentProfile.findById(profileId);
    expect(stored!.isProfileComplete).toBe(true);
    expect(stored!.requiredCredits).toBe(12);
  });

  it('assigns 20 credits for B.Tech direct admission scholars', async () => {
    const res = await request(app).put('/api/student/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        lastDegree: 'B.Tech',
      });
    expect(res.status).toBe(200);
    const stored = await StudentProfile.findById(profileId);
    expect(stored!.requiredCredits).toBe(20);
    expect(stored!.lastDegree).toBe('B.Tech');
  });
});