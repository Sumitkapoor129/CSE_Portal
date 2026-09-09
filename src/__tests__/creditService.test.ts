import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { computeTotalCredits, computeCreditsForSemester } from '../services/creditService';
import { StudentProfile } from '../models/StudentProfile';
import { Course } from '../models/Course';
import { StudentCourse } from '../models/StudentCourse';
import { Semester } from '../models/Semester';
import { User } from '../models/User';
import { UserRole, StudentType, ApprovalStatus } from '../types';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

const userId = new mongoose.Types.ObjectId().toString();
const studentId = new mongoose.Types.ObjectId().toString();
const semesterId = new mongoose.Types.ObjectId().toString();
const otherSemesterId = new mongoose.Types.ObjectId().toString();

let courseA: any; // credits: 3 → approved
let courseB: any; // credits: 4 → approved
let courseC: any; // credits: 5 → rejected
let courseOther: any; // credits: 10 → approved but in another semester

beforeAll(async () => {
  await User.create({
    _id: userId,
    email: `student-${studentId}@test.com`,
    password: 'hashedpassword',
    role: UserRole.STUDENT,
    name: 'Test Student',
    isActive: true,
  });

  await StudentProfile.create({
    _id: studentId,
    user: userId,
    collegeId: 'COL001',
    rollNumber: 'ROLL001',
    studentType: StudentType.FULL_TIME,
    department: 'CSE',
    admissionDate: new Date('2024-01-01'),
    requiredCredits: 12,
    isProfileComplete: true,
  });

  await Semester.create({
    _id: semesterId,
    student: studentId,
    semesterNumber: 1,
    academicYear: '2024-2025',
    startDate: new Date('2024-08-01'),
    endDate: new Date('2024-12-31'),
  });

  await Semester.create({
    _id: otherSemesterId,
    student: studentId,
    semesterNumber: 2,
    academicYear: '2024-2025',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-05-31'),
  });

  courseA = await Course.create({
    semester: semesterId,
    courseCode: 'CS501',
    courseName: 'Advanced Algorithms',
    credits: 3,
    status: ApprovalStatus.APPROVED,
  });

  courseB = await Course.create({
    semester: semesterId,
    courseCode: 'CS502',
    courseName: 'Machine Learning',
    credits: 4,
    status: ApprovalStatus.APPROVED,
  });

  courseC = await Course.create({
    semester: semesterId,
    courseCode: 'CS503',
    courseName: 'Distributed Systems',
    credits: 5,
    status: ApprovalStatus.APPROVED,
  });

  courseOther = await Course.create({
    semester: otherSemesterId,
    courseCode: 'CS601',
    courseName: 'Research Methods',
    credits: 10,
    status: ApprovalStatus.APPROVED,
  });
});

describe('creditService', () => {
  describe('computeTotalCredits', () => {
    it('should count only approved courses across all semesters', async () => {
      await StudentCourse.create({
        student: studentId,
        course: courseA._id,
        semester: semesterId,
        status: ApprovalStatus.APPROVED,
      });

      await StudentCourse.create({
        student: studentId,
        course: courseB._id,
        semester: semesterId,
        status: ApprovalStatus.APPROVED,
      });

      await StudentCourse.create({
        student: studentId,
        course: courseC._id,
        semester: semesterId,
        status: ApprovalStatus.REJECTED,
      });

      await StudentCourse.create({
        student: studentId,
        course: courseOther._id,
        semester: otherSemesterId,
        status: ApprovalStatus.APPROVED,
      });

      const result = await computeTotalCredits(studentId, 12);
      expect(result).toEqual({ earned: 17, required: 12, remaining: 0 });
    });

    it('should return zero earned for a student with no approved courses', async () => {
      const emptyStudentId = new mongoose.Types.ObjectId().toString();
      const result = await computeTotalCredits(emptyStudentId, 12);
      expect(result).toEqual({ earned: 0, required: 12, remaining: 12 });
    });
  });

  describe('computeCreditsForSemester', () => {
    it('should count only approved credits for the specified semester', async () => {
      const result = await computeCreditsForSemester(studentId, semesterId.toString(), 12);
      // Only courseA (3) + courseB (4) = 7 approved in semester 1
      // courseC (5) is rejected, courseOther is in semester 2
      expect(result).toEqual({ earned: 7, required: 12, remaining: 5 });
    });

    it('should return zero for an empty semester', async () => {
      const emptySemesterId = new mongoose.Types.ObjectId().toString();
      const result = await computeCreditsForSemester(studentId, emptySemesterId, 12);
      expect(result).toEqual({ earned: 0, required: 12, remaining: 12 });
    });
  });
});
