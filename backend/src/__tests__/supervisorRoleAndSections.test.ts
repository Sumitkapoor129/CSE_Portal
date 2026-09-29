import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { testApp as app } from './testApp';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { FacultyProfile } from '../models/FacultyProfile';
import { StudentProfile } from '../models/StudentProfile';
import { Supervisor } from '../models/Supervisor';
import { seedMilestones } from '../services/milestoneService';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

async function setupSupervisor() {
  await Promise.all([
    User.deleteMany({}),
    FacultyProfile.deleteMany({}),
    StudentProfile.deleteMany({}),
    Supervisor.deleteMany({}),
  ]);

  // Main Faculty
  const facultyUser = await User.create({
    email: 'faculty@college.edu',
    password: await bcrypt.hash('secret123', 10),
    name: 'Prof Main',
    role: 'supervisor',
    isActive: true,
  });

  const facultyProfile = await FacultyProfile.create({
    user: facultyUser._id,
    employeeId: 'FAC999',
    department: 'CSE',
    designation: 'Associate Professor',
    isHod: false,
  });

  // Other Faculty
  const otherFacultyUser = await User.create({
    email: 'other@college.edu',
    password: await bcrypt.hash('secret123', 10),
    name: 'Prof Other',
    role: 'supervisor',
    isActive: true,
  });

  const otherFacultyProfile = await FacultyProfile.create({
    user: otherFacultyUser._id,
    employeeId: 'FAC888',
    department: 'CSE',
    designation: 'Professor',
    isHod: false,
  });

  // Student 1: PhD, Supervisor = facultyProfile
  const u1 = await User.create({ email: 's1@college.edu', password: 'pw', name: 'PhD Scholar', role: 'student', isActive: true });
  const p1 = await StudentProfile.create({
    user: u1._id, collegeId: 'P01', rollNumber: 'R01', studentType: 'frp', program: 'phd',
    department: 'CSE', admissionDate: new Date(), supervisor: facultyProfile._id,
  });
  await Supervisor.create({ student: p1._id, supervisor: facultyProfile._id, isActive: true, assignedDate: new Date() });
  await seedMilestones(p1._id.toString());

  // Student 2: B-Tech, Co-supervisor = facultyProfile, Supervisor = otherFacultyProfile
  const u2 = await User.create({ email: 's2@college.edu', password: 'pw', name: 'BTech Student', role: 'student', isActive: true });
  const p2 = await StudentProfile.create({
    user: u2._id, collegeId: 'B01', rollNumber: 'B01', studentType: 'frp', program: 'btech',
    department: 'CSE', admissionDate: new Date(), supervisor: otherFacultyProfile._id, coSupervisor: facultyProfile._id,
  });
  await Supervisor.create({ student: p2._id, supervisor: otherFacultyProfile._id, coSupervisor: facultyProfile._id, isActive: true, assignedDate: new Date() });

  // Student 3: M-Tech, Supervisor = facultyProfile
  const u3 = await User.create({ email: 's3@college.edu', password: 'pw', name: 'MTech Student', role: 'student', isActive: true });
  const p3 = await StudentProfile.create({
    user: u3._id, collegeId: 'M01', rollNumber: 'M01', studentType: 'frp', program: 'mtech',
    department: 'CSE', admissionDate: new Date(), supervisor: facultyProfile._id,
  });
  await Supervisor.create({ student: p3._id, supervisor: facultyProfile._id, isActive: true, assignedDate: new Date() });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'faculty@college.edu', password: 'secret123' });

  return {
    token: loginRes.body.data.accessToken,
    userPayload: loginRes.body.data.user,
    facultyId: facultyProfile._id.toString(),
    p1Id: p1._id.toString(),
    p2Id: p2._id.toString(),
    p3Id: p3._id.toString(),
  };
}

describe('Supervisor Role, Program Partitioning, and Details', () => {
  it('returns designation and isHod in user payload for faculty', async () => {
    const { userPayload } = await setupSupervisor();
    expect(userPayload.designation).toBe('Associate Professor');
    expect(userPayload.isHod).toBe(false);
  });

  it('correctly tags myRole and filters by myRole and program', async () => {
    const { token, p1Id, p2Id, p3Id } = await setupSupervisor();

    // 1. Fetch all assigned students
    const allRes = await request(app)
      .get('/api/supervisor/students')
      .set('Authorization', `Bearer ${token}`);

    expect(allRes.status).toBe(200);
    expect(allRes.body.data.students.length).toBe(3);

    const s1 = allRes.body.data.students.find((s: any) => s._id === p1Id);
    expect(s1.myRole).toBe('supervisor');

    const s2 = allRes.body.data.students.find((s: any) => s._id === p2Id);
    expect(s2.myRole).toBe('co_supervisor');

    // 2. Filter by program: btech
    const btechRes = await request(app)
      .get('/api/supervisor/students?program=btech')
      .set('Authorization', `Bearer ${token}`);

    expect(btechRes.status).toBe(200);
    expect(btechRes.body.data.students.length).toBe(1);
    expect(btechRes.body.data.students[0]._id).toBe(p2Id);

    // 3. Filter by myRole: supervisor
    const supervisorRoleRes = await request(app)
      .get('/api/supervisor/students?myRole=supervisor')
      .set('Authorization', `Bearer ${token}`);

    expect(supervisorRoleRes.status).toBe(200);
    expect(supervisorRoleRes.body.data.students.length).toBe(2); // p1 and p3

    // 4. Filter by myRole: co_supervisor
    const coSupervisorRoleRes = await request(app)
      .get('/api/supervisor/students?myRole=co_supervisor')
      .set('Authorization', `Bearer ${token}`);

    expect(coSupervisorRoleRes.status).toBe(200);
    expect(coSupervisorRoleRes.body.data.students.length).toBe(1);
    expect(coSupervisorRoleRes.body.data.students[0]._id).toBe(p2Id);
  });

  it('allows co-supervisor to view student details and includes PhD milestones', async () => {
    const { token, p1Id, p2Id } = await setupSupervisor();

    // Co-supervisor access to p2
    const p2Detail = await request(app)
      .get(`/api/supervisor/students/${p2Id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(p2Detail.status).toBe(200);
    expect(p2Detail.body.data.profile).toBeDefined();

    // Supervisor access to p1 (with milestones)
    const p1Detail = await request(app)
      .get(`/api/supervisor/students/${p1Id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(p1Detail.status).toBe(200);
    expect(p1Detail.body.data.milestones).toBeDefined();
    expect(Array.isArray(p1Detail.body.data.milestones)).toBe(true);
    expect(p1Detail.body.data.milestones.length).toBeGreaterThan(0);
  });
});
