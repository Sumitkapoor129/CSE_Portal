import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { testApp as app } from './testApp';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { Semester } from '../models/Semester';
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

let userId: string;
let profileId: string;
let token: string;

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), StudentProfile.deleteMany({}), Semester.deleteMany({})]);
  const user = await User.create({
    email: 'sem@college.edu', password: await bcrypt.hash('secret123', 12),
    name: 'Sem', role: 'student', isActive: true,
  });
  userId = String(user._id);
  const profile = await StudentProfile.create({
    user: user._id, collegeId: 'CSE8001', rollNumber: '22CS8001',
    studentType: 'frp', department: 'CSE', admissionDate: new Date(),
    requiredCredits: 12, isProfileComplete: true,
  });
  profileId = String(profile._id);
  const login = await request(app).post('/api/auth/login').send({ email: 'sem@college.edu', password: 'secret123' });
  token = login.body.data.accessToken;
});

describe('F3 semester sequencing', () => {
  const createSemester = (semesterNumber: number) =>
    request(app).post('/api/student/semesters')
      .set('Authorization', `Bearer ${token}`)
      .send({ semesterNumber, academicYear: '2026-27' });

  it('first semester must be semester 1', async () => {
    const res = await createSemester(3);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Semester 3 cannot be added');
  });

  it('accepts 1 then 2, rejects 3 before 2 exists', async () => {
    const first = await createSemester(1);
    expect(first.status).toBe(201);
    const jump = await createSemester(3);
    expect(jump.status).toBe(400);
    const second = await createSemester(2);
    expect(second.status).toBe(201);
    const third = await createSemester(3);
    expect(third.status).toBe(201);
  });

  it('duplicate semester still conflicts', async () => {
    await createSemester(1);
    const dup = await createSemester(1);
    expect(dup.status).toBe(409);
  });
});