import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { testApp as app } from './testApp';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { FacultyProfile } from '../models/FacultyProfile';
import { StudentProfile } from '../models/StudentProfile';
import { SRCCommittee } from '../models/SRCCommittee';
import { SRCMemberRole } from '../types';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

async function setupAdmin() {
  await Promise.all([
    User.deleteMany({}),
    FacultyProfile.deleteMany({}),
    StudentProfile.deleteMany({}),
    SRCCommittee.deleteMany({}),
  ]);

  const admin = await User.create({
    email: 'admin@college.edu',
    password: await bcrypt.hash('secret123', 10),
    name: 'Admin User',
    role: 'admin',
    isActive: true,
  });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@college.edu', password: 'secret123' });

  return { token: loginRes.body.data.accessToken };
}

describe('HOD Role and SRC Committee Rules', () => {
  it('enforces that only one faculty member can be HOD at any time', async () => {
    const { token } = await setupAdmin();

    // 1. Create first faculty as HOD
    const res1 = await request(app)
      .post('/api/admin/faculty')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'prof1@college.edu',
        password: 'password123',
        name: 'Prof One',
        employeeId: 'FAC001',
        department: 'CSE',
        designation: 'Professor',
        isHod: true,
      });

    expect(res1.status).toBe(201);
    expect(res1.body.data.profile.isHod).toBe(true);

    const f1Id = res1.body.data.profile._id;

    // 2. Create second faculty as HOD
    const res2 = await request(app)
      .post('/api/admin/faculty')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'prof2@college.edu',
        password: 'password123',
        name: 'Prof Two',
        employeeId: 'FAC002',
        department: 'CSE',
        designation: 'Professor',
        isHod: true,
      });

    expect(res2.status).toBe(201);
    expect(res2.body.data.profile.isHod).toBe(true);

    // Verify first faculty is no longer HOD
    const prof1 = await FacultyProfile.findById(f1Id);
    expect(prof1?.isHod).toBe(false);

    // 3. Update first faculty back to HOD
    const updateRes = await request(app)
      .put(`/api/admin/faculty/${f1Id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isHod: true });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.isHod).toBe(true);

    const prof2 = await FacultyProfile.findById(res2.body.data.profile._id);
    expect(prof2?.isHod).toBe(false);
  });

  it('rejects SRC committee formation if no HOD exists in the system', async () => {
    const { token } = await setupAdmin();

    // Create supervisor and student
    const supUser = await User.create({ email: 'sup@college.edu', password: 'password', name: 'Sup', role: 'supervisor', isActive: true });
    const supProf = await FacultyProfile.create({ user: supUser._id, employeeId: 'SUP001', department: 'CSE', designation: 'Associate Professor', isHod: false });

    const stuUser = await User.create({ email: 'stu@college.edu', password: 'password', name: 'Student', role: 'student', isActive: true });
    const stuProf = await StudentProfile.create({
      user: stuUser._id,
      collegeId: 'STU001',
      rollNumber: 'R001',
      studentType: 'frp',
      department: 'CSE',
      admissionDate: new Date(),
      supervisor: supProf._id,
    });

    const res = await request(app)
      .post('/api/admin/src-committee')
      .set('Authorization', `Bearer ${token}`)
      .send({
        studentId: stuProf._id.toString(),
        members: [
          { role: SRCMemberRole.MEMBER, faculty: supProf._id.toString() },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/No HOD found in system/i);
  });

  it('automatically locks chairperson to HOD and enforces CSE internal vs outside-CSE external department rules', async () => {
    const { token } = await setupAdmin();

    // 1. Create HOD (CSE)
    const hodUser = await User.create({ email: 'hod@college.edu', password: 'password', name: 'HOD CSE', role: 'supervisor', isActive: true });
    const hodProf = await FacultyProfile.create({ user: hodUser._id, employeeId: 'HOD001', department: 'CSE', designation: 'Professor & HOD', isHod: true });

    // 2. Create Supervisor (CSE)
    const supUser = await User.create({ email: 'sup2@college.edu', password: 'password', name: 'Supervisor', role: 'supervisor', isActive: true });
    const supProf = await FacultyProfile.create({ user: supUser._id, employeeId: 'SUP002', department: 'CSE', designation: 'Professor', isHod: false });

    // 3. Create Internal CSE Member
    const memUser = await User.create({ email: 'mem1@college.edu', password: 'password', name: 'Internal Member', role: 'supervisor', isActive: true });
    const memProf = await FacultyProfile.create({ user: memUser._id, employeeId: 'MEM001', department: 'CSE', designation: 'Assistant Professor', isHod: false });

    // 4. Create External Non-CSE Member (ECE)
    const extUser = await User.create({ email: 'ext1@college.edu', password: 'password', name: 'External Member', role: 'supervisor', isActive: true });
    const extProf = await FacultyProfile.create({ user: extUser._id, employeeId: 'EXT001', department: 'ECE', designation: 'Associate Professor', isHod: false });

    // 5. Create Student assigned to Supervisor
    const stuUser = await User.create({ email: 'stu2@college.edu', password: 'password', name: 'Student 2', role: 'student', isActive: true });
    const stuProf = await StudentProfile.create({
      user: stuUser._id,
      collegeId: 'STU002',
      rollNumber: 'R002',
      studentType: 'frp',
      department: 'CSE',
      admissionDate: new Date(),
      supervisor: supProf._id,
    });

    // Attempt invalid member: assigning External Member from CSE department
    const invalidRes = await request(app)
      .post('/api/admin/src-committee')
      .set('Authorization', `Bearer ${token}`)
      .send({
        studentId: stuProf._id.toString(),
        members: [
          { role: SRCMemberRole.MEMBER, faculty: memProf._id.toString() },
          { role: SRCMemberRole.EXTERNAL_MEMBER, faculty: memProf._id.toString() }, // invalid: memProf is CSE
        ],
      });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.message).toMatch(/External Member must belong to a department outside CSE/i);

    // Valid SRC committee creation:
    // Notice admin doesn't provide chairperson; system auto-assigns HOD as chairperson!
    const validRes = await request(app)
      .post('/api/admin/src-committee')
      .set('Authorization', `Bearer ${token}`)
      .send({
        studentId: stuProf._id.toString(),
        members: [
          { role: SRCMemberRole.MEMBER, faculty: memProf._id.toString() },
          { role: SRCMemberRole.EXTERNAL_MEMBER, faculty: extProf._id.toString() },
        ],
      });

    expect(validRes.status).toBe(201);
    const createdCommittee = validRes.body.data;
    expect(createdCommittee.members).toBeDefined();

    // Verify chairperson is HOD
    const chair = createdCommittee.members.find((m: any) => m.role === SRCMemberRole.CHAIRPERSON);
    expect(chair).toBeDefined();
    const chairFacultyId = chair.faculty._id ? chair.faculty._id.toString() : chair.faculty.toString();
    expect(chairFacultyId).toBe(hodProf._id.toString());
  });
});
