import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { testApp as app } from './testApp';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { Semester } from '../models/Semester';
import { FacultyProfile } from '../models/FacultyProfile';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

async function setup(withSupervisor: boolean) {
  await Promise.all([User.deleteMany({}), StudentProfile.deleteMany({}), Semester.deleteMany({}), FacultyProfile.deleteMany({})]);
  const user = await User.create({
    email: 'gate@college.edu', password: await bcrypt.hash('secret123', 12),
    name: 'Gate', role: 'student', isActive: true,
  });
  const prof = withSupervisor ? await FacultyProfile.create({
    user: new mongoose.Types.ObjectId(), employeeId: 'FAC-GATE', department: 'CSE', designation: 'Professor',
  }) : null;
  await StudentProfile.create({
    user: user._id, collegeId: 'CSE7001', rollNumber: '22CS7001',
    studentType: 'frp', department: 'CSE', admissionDate: new Date(),
    requiredCredits: 12, isProfileComplete: true,
    supervisor: prof?._id ?? undefined,
  });
  const sem = await Semester.create({ student: (await StudentProfile.findOne({ user: user._id }))!._id, semesterNumber: 1, academicYear: '2026-27', startDate: new Date('2026-08-01'), endDate: new Date('2027-07-31') });
  const login = await request(app).post('/api/auth/login').send({ email: 'gate@college.edu', password: 'secret123' });
  return { token: login.body.data.accessToken, semId: String(sem._id) };
}

describe('F4 supervisor gate', () => {
  it('blocks course request without a supervisor', async () => {
    const { token, semId } = await setup(false);
    const res = await request(app).post(`/api/student/semesters/${semId}/courses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ courseCode: 'CS701', courseName: 'Advanced Algorithms', credits: 4 });
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('supervisor');
  });

  it('blocks thesis submission without a supervisor', async () => {
    const { token } = await setup(false);
    const res = await request(app).post('/api/student/thesis')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'T', documentUrl: 'https://x/y.pdf' });
    expect(res.status).toBe(403);
  });

  it('allows course request with a supervisor', async () => {
    const { token, semId } = await setup(true);
    const res = await request(app).post(`/api/student/semesters/${semId}/courses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ courseCode: 'CS701', courseName: 'Advanced Algorithms', credits: 4 });
    expect(res.status).toBe(201);
  });
});