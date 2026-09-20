import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { testApp as app } from './testApp';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { Milestone } from '../models/Milestone';
import { Notification } from '../models/Notification';
import bcrypt from 'bcryptjs';
import { MilestoneKey, MilestoneStatus } from '../types';

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
let manualMilestoneId: string;

const toLocalDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    StudentProfile.deleteMany({}),
    Milestone.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  const user = await User.create({
    email: 'milestones@college.edu',
    password: await bcrypt.hash('secret123', 12),
    name: 'Milestone Scholar',
    role: 'student',
    isActive: true,
  });

  const profile = await StudentProfile.create({
    user: user._id,
    collegeId: 'CSE7001',
    rollNumber: '22CS7001',
    studentType: 'frp',
    department: 'CSE',
    admissionDate: new Date(2024, 0, 1), // 2024-01-01 local
    requiredCredits: 12,
    isProfileComplete: true,
  });

  const manual = await Milestone.create({
    student: profile._id,
    key: MilestoneKey.COMPREHENSIVE_EXAM,
    title: 'Comprehensive Examination',
    description: 'test',
    status: MilestoneStatus.PENDING,
    order: 3,
    dateSource: 'manual',
  });
  manualMilestoneId = String(manual._id);

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'milestones@college.edu', password: 'secret123' });
  token = login.body.data.accessToken;
});

describe('Milestone date validation (student routes)', () => {
  describe('completeMilestone', () => {
    it('rejects an invalid completion date with 400', async () => {
      const res = await request(app)
        .put(`/api/student/milestones/${manualMilestoneId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({ completedDate: 'not-a-date' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid completion date');
    });

    it('rejects a future completion date with 400', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const res = await request(app)
        .put(`/api/student/milestones/${manualMilestoneId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({ completedDate: toLocalDateStr(tomorrow) });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Completion date cannot be in the future');
    });

    it('rejects a completion date before admission with 400', async () => {
      const res = await request(app)
        .put(`/api/student/milestones/${manualMilestoneId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({ completedDate: '2020-01-01' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Completion date cannot be before admission date');
    });

    it('accepts a valid completion date (today) and records updatedBy', async () => {
      const res = await request(app)
        .put(`/api/student/milestones/${manualMilestoneId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({ completedDate: toLocalDateStr(new Date()) });
      expect(res.status).toBe(200);

      const milestone = await Milestone.findById(manualMilestoneId);
      expect(milestone!.status).toBe(MilestoneStatus.COMPLETED);
      expect(milestone!.updatedBy).toBeDefined();
    });

    it('defaults completedAt to today when no date is provided', async () => {
      const res = await request(app)
        .put(`/api/student/milestones/${manualMilestoneId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(200);

      const milestone = await Milestone.findById(manualMilestoneId);
      expect(milestone!.completedAt).toBeDefined();
    });
  });

  describe('updateMyMilestoneDate', () => {
    it('rejects an invalid due date with 400', async () => {
      const res = await request(app)
        .put(`/api/student/milestones/${manualMilestoneId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ dueDate: 'garbage' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid due date');
    });

    it('rejects a due date earlier than admission minus one month with 400', async () => {
      const res = await request(app)
        .put(`/api/student/milestones/${manualMilestoneId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ dueDate: '2020-01-01' });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('earlier than one month before admission');
    });

    it('rejects a due date beyond admission plus nine years with 400', async () => {
      const res = await request(app)
        .put(`/api/student/milestones/${manualMilestoneId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ dueDate: '2040-01-01' });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('later than 9 years after admission');
    });

    it('accepts a valid due date and clears to TBD on null', async () => {
      const ok = await request(app)
        .put(`/api/student/milestones/${manualMilestoneId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ dueDate: '2025-06-01' });
      expect(ok.status).toBe(200);

      const clear = await request(app)
        .put(`/api/student/milestones/${manualMilestoneId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ dueDate: null });
      expect(clear.status).toBe(200);

      const milestone = await Milestone.findById(manualMilestoneId);
      expect(milestone!.dueDate).toBeUndefined();
    });
  });
});