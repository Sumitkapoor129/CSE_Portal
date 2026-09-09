import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { checkDeadlines, DAY_MS } from '../services/deadlineService';
import { Deadline } from '../models/Deadline';
import { Notification } from '../models/Notification';
import { StudentProfile } from '../models/StudentProfile';
import { User } from '../models/User';
import { UserRole, StudentType } from '../types';
import { sendNotificationEmail } from '../utils/email';

jest.mock('../utils/email');

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

beforeEach(async () => {
  await Deadline.deleteMany({});
  await Notification.deleteMany({});
  await StudentProfile.deleteMany({});
  await User.deleteMany({});
  jest.clearAllMocks();

  const user = await User.create({
    email: 'deadline-test@test.com',
    password: 'hashedpw',
    role: UserRole.STUDENT,
    name: 'Deadline Student',
    isActive: true,
  });
  userId = user._id.toString();

  const profile = await StudentProfile.create({
    user: userId,
    collegeId: 'DEAD001',
    rollNumber: 'DEADR001',
    studentType: StudentType.FULL_TIME,
    department: 'CSE',
    admissionDate: new Date('2024-01-01'),
    requiredCredits: 12,
    isProfileComplete: true,
  });
  studentId = profile._id.toString();
});

describe('deadlineService', () => {
  describe('checkDeadlines', () => {
    it('should create notification for a deadline due within 7 days and mark it sent', async () => {
      const creatorId = new mongoose.Types.ObjectId().toString();
      const dueTomorrow = new Date(Date.now() + 1 * DAY_MS);

      await Deadline.create({
        title: 'Assignment 1',
        description: 'Submit assignment',
        dueDate: dueTomorrow,
        student: studentId,
        createdBy: creatorId,
        notificationSent: false,
      });

      const result = await checkDeadlines();
      expect(result).toEqual({ checked: 1, notif: 1, emails: 1 });

      const notification = await Notification.findOne({ user: userId });
      expect(notification).not.toBeNull();
      expect(notification!.title).toContain('Assignment 1');
      expect(notification!.type).toBe('deadline');

      const deadline = await Deadline.findOne({ title: 'Assignment 1' });
      expect(deadline!.notificationSent).toBe(true);
    });

    it('should NOT touch a deadline due beyond 7 days', async () => {
      const creatorId = new mongoose.Types.ObjectId().toString();
      const dueIn30 = new Date(Date.now() + 30 * DAY_MS);

      await Deadline.create({
        title: 'Far Future Task',
        description: 'Not yet',
        dueDate: dueIn30,
        student: studentId,
        createdBy: creatorId,
        notificationSent: false,
      });

      const result = await checkDeadlines();
      expect(result).toEqual({ checked: 0, notif: 0, emails: 0 });

      const deadline = await Deadline.findOne({ title: 'Far Future Task' });
      expect(deadline!.notificationSent).toBe(false);
    });

    it('should not create duplicate notifications on re-run', async () => {
      const creatorId = new mongoose.Types.ObjectId().toString();
      const dueIn2 = new Date(Date.now() + 2 * DAY_MS);

      await Deadline.create({
        title: 'Mid Deadline',
        description: 'Due soon',
        dueDate: dueIn2,
        student: studentId,
        createdBy: creatorId,
        notificationSent: false,
      });

      await checkDeadlines();

      const countAfterFirst = await Notification.countDocuments({ user: userId });
      expect(countAfterFirst).toBe(1);

      await checkDeadlines();

      const countAfterSecond = await Notification.countDocuments({ user: userId });
      expect(countAfterSecond).toBe(1);
    });

    it('should call sendNotificationEmail for each notified user', async () => {
      const creatorId = new mongoose.Types.ObjectId().toString();
      const dueIn3 = new Date(Date.now() + 3 * DAY_MS);

      await Deadline.create({
        title: 'Email Test',
        description: 'Should email',
        dueDate: dueIn3,
        student: studentId,
        createdBy: creatorId,
        notificationSent: false,
      });

      await checkDeadlines();

      expect(sendNotificationEmail).toHaveBeenCalledTimes(1);
      expect(sendNotificationEmail).toHaveBeenCalledWith(
        'deadline-test@test.com',
        expect.stringContaining('Email Test'),
        expect.any(String)
      );
    });
  });
});
