import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { testApp as app } from './testApp';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { FacultyProfile } from '../models/FacultyProfile';
import { StudentProfile } from '../models/StudentProfile';
import { Supervisor } from '../models/Supervisor';
import { Event } from '../models/Event';
import { Milestone } from '../models/Milestone';
import { EventType, MilestoneKey, MilestoneStatus } from '../types';
import { getEligibleStudentOptions } from '../utils/participants';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

async function setup() {
  await Promise.all([
    User.deleteMany({}),
    FacultyProfile.deleteMany({}),
    StudentProfile.deleteMany({}),
    Supervisor.deleteMany({}),
    Event.deleteMany({}),
    Milestone.deleteMany({}),
  ]);

  const facultyUser = await User.create({
    email: 'faculty@college.edu',
    password: await bcrypt.hash('secret123', 10),
    name: 'Prof Event Creator',
    role: 'supervisor',
    isActive: true,
  });

  const facultyProfile = await FacultyProfile.create({
    user: facultyUser._id,
    employeeId: 'FAC777',
    department: 'CSE',
    designation: 'Associate Professor',
    isHod: false,
  });

  const studentUser = await User.create({
    email: 'scholar@college.edu',
    password: await bcrypt.hash('secret123', 10),
    name: 'Scholar One',
    role: 'student',
    isActive: true,
  });

  const studentProfile = await StudentProfile.create({
    user: studentUser._id,
    collegeId: 'SCH001',
    rollNumber: 'R001',
    studentType: 'frp',
    program: 'phd',
    department: 'CSE',
    admissionDate: new Date(),
    supervisor: facultyProfile._id,
  });

  await Supervisor.create({
    student: studentProfile._id,
    supervisor: facultyProfile._id,
    isActive: true,
    assignedDate: new Date(),
  });

  // Mark comprehensive exam milestone as completed
  await Milestone.create({
    student: studentProfile._id,
    key: MilestoneKey.COMPREHENSIVE_EXAM,
    title: 'Comprehensive Examination',
    description: 'Comprehensive Exam',
    status: MilestoneStatus.COMPLETED,
    order: 3,
    completedAt: new Date(),
  });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'faculty@college.edu', password: 'secret123' });

  return {
    token: loginRes.body.data.accessToken,
    facultyUserId: facultyUser._id.toString(),
    studentUserId: studentUser._id.toString(),
    studentProfileId: studentProfile._id.toString(),
  };
}

describe('Faculty Event Creation Improvements', () => {
  it('returns student options with completedMilestones and studentType', async () => {
    const { facultyUserId, studentProfileId } = await setup();

    const options = await getEligibleStudentOptions(facultyUserId);
    expect(options.length).toBe(1);
    expect(options[0].studentType).toBe('frp');
    expect(options[0].program).toBe('phd');
    expect(options[0].completedMilestones).toContain(MilestoneKey.COMPREHENSIVE_EXAM);
  });

  it('allows event creation without endTime and without deadline', async () => {
    const { token, studentUserId } = await setup();

    const res = await request(app)
      .post('/api/supervisor/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Progress Seminar Review',
        eventType: EventType.PROGRESS_SEMINAR,
        date: '2026-10-15',
        startTime: '10:00',
        location: 'Room 201',
        participants: [studentUserId],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Progress Seminar Review');
    expect(res.body.data.eventType).toBe(EventType.PROGRESS_SEMINAR);
    expect(res.body.data.deadline).toBeUndefined();
  });

  it('supports other event type with customEventType', async () => {
    const { token, studentUserId } = await setup();

    const res = await request(app)
      .post('/api/supervisor/events')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Department Workshop',
        eventType: EventType.OTHER,
        customEventType: 'Department Workshop Session',
        date: '2026-10-20',
        startTime: '14:00',
        location: 'Lab 3',
        participants: [studentUserId],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.eventType).toBe('other');
    expect(res.body.data.customEventType).toBe('Department Workshop Session');
  });
});
