import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { Milestone } from '../models/Milestone';
import { Internship } from '../models/Internship';
import { MilestoneKey, MilestoneStatus, UserRole, InternshipStatus } from '../types';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('Internship Module & Gates', () => {
  it('should create an internship with valid dates and duration', async () => {
    const user = await User.create({
      name: 'Intern Scholar',
      email: 'intern@test.com',
      password: 'hash',
      role: UserRole.STUDENT,
      isActive: true,
    });

    const profile = await StudentProfile.create({
      user: user._id,
      collegeId: 'COL004',
      rollNumber: 'ROLL004',
      studentType: 'frp',
      department: 'CSE',
      admissionDate: new Date(),
    });

    // Mark topic registration completed
    await Milestone.create({
      student: profile._id,
      key: MilestoneKey.TOPIC_REGISTRATION,
      title: 'Topic Registration',
      order: 4,
      status: MilestoneStatus.COMPLETED,
    });

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 180 * 86400000); // 6 months
    const internship = await Internship.create({
      student: profile._id,
      organization: 'Google Research',
      researchTopic: 'Distributed Systems',
      startDate,
      endDate,
      durationMonths: 6,
      status: InternshipStatus.PENDING,
    });

    expect(internship._id).toBeDefined();
    expect(internship.durationMonths).toBe(6);
    expect(internship.status).toBe(InternshipStatus.PENDING);
  });
});
