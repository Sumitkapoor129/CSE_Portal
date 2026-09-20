import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { Milestone } from '../models/Milestone';
import { ComprehensiveExam } from '../models/ComprehensiveExam';
import { MilestoneKey, MilestoneStatus, UserRole, ComprehensiveExamResult } from '../types';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('Comprehensive Exam Module', () => {
  it('should enforce attempt limits and record 3-month retake deadline on fail', async () => {
    const user = await User.create({
      name: 'Exam Candidate',
      email: 'candidate@test.com',
      password: 'hash',
      role: UserRole.STUDENT,
      isActive: true,
    });

    const profile = await StudentProfile.create({
      user: user._id,
      collegeId: 'COL005',
      rollNumber: 'ROLL005',
      studentType: 'frp',
      department: 'CSE',
      admissionDate: new Date(),
    });

    // Milestone for coursework completed
    await Milestone.create({
      student: profile._id,
      key: MilestoneKey.COURSE_WORK,
      title: 'Course Work',
      order: 2,
      status: MilestoneStatus.COMPLETED,
    });

    // Milestone for comprehensive exam
    const compMilestone = await Milestone.create({
      student: profile._id,
      key: MilestoneKey.COMPREHENSIVE_EXAM,
      title: 'Comprehensive Exam',
      order: 3,
      status: MilestoneStatus.PENDING,
    });

    const examDate = new Date();
    const retakeDeadline = new Date(examDate.getTime() + 90 * 86400000);

    const attempt1 = await ComprehensiveExam.create({
      student: profile._id,
      attemptNumber: 1,
      examDate,
      result: ComprehensiveExamResult.FAILED,
      retakeDeadline,
      remarks: 'Needs deeper knowledge in algorithms',
    });

    expect(attempt1.attemptNumber).toBe(1);
    expect(attempt1.result).toBe(ComprehensiveExamResult.FAILED);
    expect(attempt1.retakeDeadline).toBeDefined();

    // Now record attempt 2 passed
    const attempt2Date = new Date(examDate.getTime() + 60 * 86400000);
    const attempt2 = await ComprehensiveExam.create({
      student: profile._id,
      attemptNumber: 2,
      examDate: attempt2Date,
      result: ComprehensiveExamResult.PASSED,
      remarks: 'Satisfactory performance',
    });

    expect(attempt2.attemptNumber).toBe(2);
    expect(attempt2.result).toBe(ComprehensiveExamResult.PASSED);

    // Attempt 3 cannot exist due to schema min: 1, max: 2 or unique index
    await expect(
      ComprehensiveExam.create({
        student: profile._id,
        attemptNumber: 3,
        examDate: new Date(),
        result: ComprehensiveExamResult.PASSED,
      })
    ).rejects.toThrow();
  });
});
