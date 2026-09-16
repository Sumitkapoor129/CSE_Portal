import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { testApp as app } from './testApp';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { Semester } from '../models/Semester';
import { FacultyProfile } from '../models/FacultyProfile';
import { Supervisor } from '../models/Supervisor';
import { StudentCourse } from '../models/StudentCourse';

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
  await Promise.all([
    User.deleteMany({}), StudentProfile.deleteMany({}), Semester.deleteMany({}),
    FacultyProfile.deleteMany({}), Supervisor.deleteMany({}), StudentCourse.deleteMany({}),
  ]);
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
  return { token: login.body.data.accessToken, semId: String(sem._id), userId: String(user._id) };
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

  it('denies cross-supervisor course approval', async () => {
    await Promise.all([
      User.deleteMany({}), StudentProfile.deleteMany({}), Semester.deleteMany({}),
      FacultyProfile.deleteMany({}), Supervisor.deleteMany({}), StudentCourse.deleteMany({}),
    ]);

    const studentAUser = await User.create({
      email: 'studA@college.edu', password: await bcrypt.hash('secret123', 12),
      name: 'StudentA', role: 'student', isActive: true,
    });
    const studentBUser = await User.create({
      email: 'studB@college.edu', password: await bcrypt.hash('secret123', 12),
      name: 'StudentB', role: 'student', isActive: true,
    });
    const supervisorAUser = await User.create({
      email: 'supA@college.edu', password: await bcrypt.hash('secret123', 12),
      name: 'SupervisorA', role: 'supervisor', isActive: true,
    });
    const supervisorBUser = await User.create({
      email: 'supB@college.edu', password: await bcrypt.hash('secret123', 12),
      name: 'SupervisorB', role: 'supervisor', isActive: true,
    });

    const supAProfile = await FacultyProfile.create({
      user: supervisorAUser._id, employeeId: 'FAC-A', department: 'CSE', designation: 'Professor',
    });
    const supBProfile = await FacultyProfile.create({
      user: supervisorBUser._id, employeeId: 'FAC-B', department: 'CSE', designation: 'Professor',
    });

    const studentAProfile = await StudentProfile.create({
      user: studentAUser._id, collegeId: 'CSE9001', rollNumber: '22CS9001',
      studentType: 'frp', department: 'CSE', admissionDate: new Date(),
      requiredCredits: 12, isProfileComplete: true, supervisor: supAProfile._id,
    });
    const studentBProfile = await StudentProfile.create({
      user: studentBUser._id, collegeId: 'CSE9002', rollNumber: '22CS9002',
      studentType: 'frp', department: 'CSE', admissionDate: new Date(),
      requiredCredits: 12, isProfileComplete: true, supervisor: supBProfile._id,
    });

    await Supervisor.create({
      student: studentAProfile._id, supervisor: supAProfile._id,
      assignedDate: new Date(), isActive: true,
    });
    await Supervisor.create({
      student: studentBProfile._id, supervisor: supBProfile._id,
      assignedDate: new Date(), isActive: true,
    });

    const sem = await Semester.create({
      student: studentAProfile._id, semesterNumber: 1, academicYear: '2026-27',
      startDate: new Date('2026-08-01'), endDate: new Date('2027-07-31'),
    });

    const loginStudentA = await request(app).post('/api/auth/login').send({ email: 'studA@college.edu', password: 'secret123' });
    const courseRes = await request(app).post(`/api/student/semesters/${sem._id}/courses`)
      .set('Authorization', `Bearer ${loginStudentA.body.data.accessToken}`)
      .send({ courseCode: 'CS901', courseName: 'Test Course', credits: 3 });
    expect(courseRes.status).toBe(201);

    const studentCourse = (await StudentCourse.findOne({ student: studentAProfile._id }))!;

    const loginB = await request(app).post('/api/auth/login').send({ email: 'supB@college.edu', password: 'secret123' });
    const tokenB = loginB.body.data.accessToken;

    const res = await request(app).put(`/api/supervisor/courses/${studentCourse._id}/approve`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ status: 'approved', comment: 'Looks good' });
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('not assigned');
  });
});