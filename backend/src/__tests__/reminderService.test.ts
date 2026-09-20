import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  computeDaysRemaining,
  levelForDays,
  generateMilestoneReminders,
  ensureMilestoneRemindersForStudent,
  pickCurrentReminderLevel,
} from '../services/reminderService';
import { parseDateOnly } from '../services/milestoneService';
import { Milestone } from '../models/Milestone';
import { Notification } from '../models/Notification';
import { StudentProfile } from '../models/StudentProfile';
import { User } from '../models/User';
import { MilestoneKey, MilestoneStatus, UserRole, StudentType } from '../types';

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
let studentId: string;

const runReminders = async (): Promise<{ checked: number; created: number }> => {
  const result = await generateMilestoneReminders();
  if ('error' in result) {
    throw new Error(result.error);
  }
  return result;
};

beforeEach(async () => {
  await Notification.deleteMany({});
  await Milestone.deleteMany({});
  await StudentProfile.deleteMany({});
  await User.deleteMany({});

  const user = await User.create({
    email: 'reminder-test@test.com',
    password: 'hashedpw',
    role: UserRole.STUDENT,
    name: 'Reminder Student',
    isActive: true,
  });
  userId = user._id.toString();

  const profile = await StudentProfile.create({
    user: userId,
    collegeId: 'REM001',
    rollNumber: 'REMR001',
    studentType: StudentType.FULL_TIME,
    department: 'CSE',
    admissionDate: new Date('2024-01-01'),
    requiredCredits: 12,
    isProfileComplete: true,
  });
  studentId = profile._id.toString();
});

describe('reminderService', () => {
  describe('levelForDays', () => {
    it('maps days to reminder buckets', () => {
      expect(levelForDays(-5)).toBe('overdue');
      expect(levelForDays(-1)).toBe('overdue');
      expect(levelForDays(0)).toBe('0');
      expect(levelForDays(1)).toBe('1');
      expect(levelForDays(2)).toBe('3');
      expect(levelForDays(3)).toBe('3');
      expect(levelForDays(4)).toBe('7');
      expect(levelForDays(7)).toBe('7');
      expect(levelForDays(8)).toBe('15');
      expect(levelForDays(15)).toBe('15');
      expect(levelForDays(16)).toBeNull();
      expect(levelForDays(30)).toBeNull();
    });
  });

  describe('computeDaysRemaining', () => {
    it('computes date-only day difference for +N days', () => {
      const due = new Date();
      due.setDate(due.getDate() + 10);
      expect(computeDaysRemaining(due)).toBe(10);
    });

    it('is timezone/DST robust when parsing YYYY-MM-DD as local midnight', () => {
      const now = new Date();
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
      const str = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(
        target.getDate()
      ).padStart(2, '0')}`;

      const parsed = parseDateOnly(str);
      expect(isNaN(parsed.getTime())).toBe(false);
      // Local-midnight parsing must yield the same calendar-day diff as the
      // Date arithmetic above, regardless of the machine timezone or DST.
      expect(computeDaysRemaining(parsed)).toBe(7);

      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')}`;
      expect(computeDaysRemaining(parseDateOnly(todayStr))).toBe(0);
    });
  });

  describe('generateMilestoneReminders', () => {
    it('creates one notification per bucket and is idempotent', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 10);

      await Milestone.create({
        student: studentId,
        key: MilestoneKey.COURSE_WORK,
        title: 'Course Work Completion',
        description: 'test',
        status: MilestoneStatus.PENDING,
        order: 2,
        dueDate,
      });

      const first = await runReminders();
      expect(first.created).toBe(1);

      const milestone = await Milestone.findOne({ student: studentId });
      expect(milestone!.reminderLevels).toContain('15');

      const notifications = await Notification.find({ user: userId });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('milestone_reminder');
      expect(notifications[0].severity).toBe('info');
      expect(notifications[0].daysRemaining).toBe(10);

      const second = await runReminders();
      expect(second.created).toBe(0);

      const countAfterSecond = await Notification.countDocuments({ user: userId });
      expect(countAfterSecond).toBe(1);
    });

    it('notifies overdue milestones exactly once', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 2);

      await Milestone.create({
        student: studentId,
        key: MilestoneKey.SRC_FORMED,
        title: 'SRC Formation',
        description: 'test',
        status: MilestoneStatus.PENDING,
        order: 1,
        dueDate,
      });

      const first = await runReminders();
      expect(first.created).toBe(1);

      const milestone = await Milestone.findOne({ student: studentId });
      expect(milestone!.reminderLevels).toContain('overdue');

      const notifications = await Notification.find({ user: userId });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].severity).toBe('critical');
      expect(notifications[0].title).toContain('Overdue');

      const second = await runReminders();
      expect(second.created).toBe(0);
    });

    it('skips completed milestones regardless of dueDate', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);

      await Milestone.create({
        student: studentId,
        key: MilestoneKey.PRE_SUBMISSION,
        title: 'Pre-Submission Seminar',
        description: 'test',
        status: MilestoneStatus.COMPLETED,
        order: 7,
        dueDate,
        completedAt: new Date(),
      });

      const result = await runReminders();
      expect(result.created).toBe(0);

      const notifications = await Notification.countDocuments({ user: userId });
      expect(notifications).toBe(0);
    });

    it('does not create duplicates when two sweeps interleave (atomic claim)', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 10);

      await Milestone.create({
        student: studentId,
        key: MilestoneKey.COURSE_WORK,
        title: 'Course Work Completion',
        description: 'test',
        status: MilestoneStatus.PENDING,
        order: 2,
        dueDate,
      });

      // Both calls read the milestone before either claims the level. Only one
      // claim-then-create (TOCTOU-safe) path may win per milestone + level.
      const [first, second] = await Promise.all([runReminders(), runReminders()]);
      expect(first.created + second.created).toBe(1);

      const milestone = await Milestone.findOne({ student: studentId });
      expect(milestone!.reminderLevels).toContain('15');

      const notifications = await Notification.find({ user: userId });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('milestone_reminder');
    });
  });

  describe('ensureMilestoneRemindersForStudent', () => {
    it('creates reminders scoped to one student', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 5);

      await Milestone.create({
        student: studentId,
        key: MilestoneKey.TOPIC_REGISTRATION,
        title: 'Topic Registration Seminar',
        description: 'test',
        status: MilestoneStatus.PENDING,
        order: 4,
        dueDate,
      });

      await ensureMilestoneRemindersForStudent(studentId, userId);

      const milestone = await Milestone.findOne({ student: studentId });
      expect(milestone!.reminderLevels).toContain('7');

      const notifications = await Notification.find({ user: userId });
      expect(notifications).toHaveLength(1);
      expect(notifications[0].severity).toBe('warning');
    });
  });

  describe('pickCurrentReminderLevel', () => {
    it('returns the most urgent notified level', () => {
      expect(pickCurrentReminderLevel({ reminderLevels: ['15', '1'] })).toBe('1');
      expect(pickCurrentReminderLevel({ reminderLevels: ['7', 'overdue'] })).toBe('overdue');
      expect(pickCurrentReminderLevel({})).toBeNull();
      expect(pickCurrentReminderLevel(null)).toBeNull();
    });
  });
});