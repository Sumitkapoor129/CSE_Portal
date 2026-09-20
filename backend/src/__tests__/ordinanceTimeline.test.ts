import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { Milestone } from '../models/Milestone';
import { ComprehensiveExam } from '../models/ComprehensiveExam';
import {
  evaluateStudentTimeline,
  DAY_MS,
} from '../services/ordinanceTimelineService';
import { seedMilestones } from '../services/milestoneService';
import { ComprehensiveExamResult, MilestoneKey, MilestoneStatus, UserRole } from '../types';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('Ordinance Timeline Service', () => {
  it('should flag SRC formation as overdue if > 14 days elapsed and incomplete', async () => {
    const user = await User.create({
      name: 'Scholar One',
      email: 'scholar1@test.com',
      password: 'hash',
      role: UserRole.STUDENT,
      isActive: true,
    });

    const admissionDate = new Date(Date.now() - 20 * DAY_MS); // 20 days ago
    const profile = await StudentProfile.create({
      user: user._id,
      collegeId: 'COL001',
      rollNumber: 'ROLL001',
      studentType: 'frp',
      department: 'CSE',
      admissionDate,
    });

    await seedMilestones(profile._id.toString(), admissionDate);

    const evaluation = await evaluateStudentTimeline(profile._id.toString());
    expect(evaluation).not.toBeNull();
    expect(evaluation!.alerts.some((a) => a.code === 'SRC_OVERDUE')).toBe(true);
    expect(evaluation!.dues.some((d) => d.dueMilestone === 'SRC Formation' && d.status === 'overdue')).toBe(true);
  });

  it('should calculate 8-year registration validity correctly', async () => {
    const user = await User.create({
      name: 'Senior Scholar',
      email: 'senior@test.com',
      password: 'hash',
      role: UserRole.STUDENT,
      isActive: true,
    });

    // 8.5 years ago
    const admissionDate = new Date(Date.now() - 8.5 * 365 * DAY_MS);
    const profile = await StudentProfile.create({
      user: user._id,
      collegeId: 'COL002',
      rollNumber: 'ROLL002',
      studentType: 'frp',
      department: 'CSE',
      admissionDate,
    });

    const evaluation = await evaluateStudentTimeline(profile._id.toString());
    expect(evaluation).not.toBeNull();
    expect(evaluation!.validity.status).toBe('expired');
    expect(evaluation!.validity.isExpired).toBe(true);
    expect(evaluation!.alerts.some((a) => a.code === 'REGISTRATION_EXPIRED')).toBe(true);
  });

  it('should set 3-month retake deadline on failed 1st comprehensive exam', async () => {
    const user = await User.create({
      name: 'Exam Scholar',
      email: 'exam@test.com',
      password: 'hash',
      role: UserRole.STUDENT,
      isActive: true,
    });

    const admissionDate = new Date(Date.now() - 100 * DAY_MS);
    const profile = await StudentProfile.create({
      user: user._id,
      collegeId: 'COL003',
      rollNumber: 'ROLL003',
      studentType: 'frp',
      department: 'CSE',
      admissionDate,
    });

    await seedMilestones(profile._id.toString(), admissionDate);

    // Record failed attempt 1 (20 days ago)
    const examDate = new Date(Date.now() - 20 * DAY_MS);
    const retakeDeadline = new Date(examDate.getTime() + 90 * DAY_MS);
    await ComprehensiveExam.create({
      student: profile._id,
      attemptNumber: 1,
      examDate,
      result: ComprehensiveExamResult.FAILED,
      retakeDeadline,
    });

    const evaluation = await evaluateStudentTimeline(profile._id.toString());
    expect(evaluation).not.toBeNull();
    expect(evaluation!.comprehensiveExamSummary.attemptsCount).toBe(1);
    expect(evaluation!.comprehensiveExamSummary.hasPassed).toBe(false);
    expect(evaluation!.comprehensiveExamSummary.canTakeSecondAttempt).toBe(true);
    expect(evaluation!.alerts.some((a) => a.code === 'COMP_RETAKE_DUE_SOON')).toBe(true);
  });
});
