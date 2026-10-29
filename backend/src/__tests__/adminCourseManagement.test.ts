import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { testApp as app } from './testApp';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { FacultyProfile } from '../models/FacultyProfile';
import { StudentProfile } from '../models/StudentProfile';
import { Semester } from '../models/Semester';
import { Credits } from '../models/Credits';
import { StudentCourse } from '../models/StudentCourse';

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
    Semester.deleteMany({}),
    Credits.deleteMany({}),
    StudentCourse.deleteMany({}),
  ]);

  const admin = await User.create({
    email: 'admin@college.edu',
    password: await bcrypt.hash('secret123', 10),
    name: 'Admin User',
    role: 'admin',
    isActive: true,
  });

  const stuUser = await User.create({
    email: 'stu@college.edu',
    password: await bcrypt.hash('secret123', 10),
    name: 'Student One',
    role: 'student',
    isActive: true,
  });

  const studentProfile = await StudentProfile.create({
    user: stuUser._id,
    collegeId: 'STU101',
    rollNumber: 'R101',
    studentType: 'frp',
    program: 'phd',
    department: 'CSE',
    admissionDate: new Date(),
    requiredCredits: 12,
  });

  const semester = await Semester.create({
    student: studentProfile._id,
    semesterNumber: 1,
    academicYear: '2026-27',
    startDate: new Date('2026-08-01'),
    endDate: new Date('2026-12-31'),
  });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@college.edu', password: 'secret123' });

  return {
    token: loginRes.body.data.accessToken,
    studentId: studentProfile._id.toString(),
    semesterId: semester._id.toString(),
  };
}

describe('Admin Direct Course Management', () => {
  it('allows admin to add a completed course without approval and directly awards credits', async () => {
    const { token, studentId, semesterId } = await setup();

    const addRes = await request(app)
      .post(`/api/admin/students/${studentId}/courses`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        semesterId,
        courseCode: 'CS701',
        courseName: 'Advanced Algorithms',
        credits: 4,
        status: 'completed',
        grade: 'A',
      });

    expect(addRes.status).toBe(201);
    expect(addRes.body.data.course.status).toBe('completed');
    expect(addRes.body.data.studentCourse.status).toBe('completed');

    // Check credits were directly computed and updated
    const creditsDoc = await Credits.findOne({ student: studentId, semester: semesterId });
    expect(creditsDoc).toBeDefined();
    expect(creditsDoc?.earnedCredits).toBe(4);
  });

  it('allows admin to list, edit, and delete courses with credit recalculation', async () => {
    const { token, studentId, semesterId } = await setup();

    // Add first course (4 credits completed)
    const c1 = await request(app)
      .post(`/api/admin/students/${studentId}/courses`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        semesterId,
        courseCode: 'CS701',
        courseName: 'Course 1',
        credits: 4,
        status: 'completed',
      });

    // Add second course (4 credits completed)
    const c2 = await request(app)
      .post(`/api/admin/students/${studentId}/courses`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        semesterId,
        courseCode: 'CS702',
        courseName: 'Course 2',
        credits: 4,
        status: 'completed',
      });

    // Check total earned credits is 8
    let creditsDoc = await Credits.findOne({ student: studentId, semester: semesterId });
    expect(creditsDoc?.earnedCredits).toBe(8);

    // List courses
    const listRes = await request(app)
      .get(`/api/admin/students/${studentId}/courses`)
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.studentCourses.length).toBe(2);

    // Edit first course: change credits from 4 to 3
    const editRes = await request(app)
      .put(`/api/admin/students/${studentId}/courses/${c1.body.data.studentCourse._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ credits: 3 });

    expect(editRes.status).toBe(200);

    creditsDoc = await Credits.findOne({ student: studentId, semester: semesterId });
    expect(creditsDoc?.earnedCredits).toBe(7); // 3 + 4

    // Delete second course
    const delRes = await request(app)
      .delete(`/api/admin/students/${studentId}/courses/${c2.body.data.studentCourse._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(delRes.status).toBe(200);

    creditsDoc = await Credits.findOne({ student: studentId, semester: semesterId });
    expect(creditsDoc?.earnedCredits).toBe(3); // only course 1 remains
  });

  it('allows admin to toggle course status between completed and pending with credit adjustment', async () => {
    const { token, studentId, semesterId } = await setup();

    // 1. Add course with status pending
    const addRes = await request(app)
      .post(`/api/admin/students/${studentId}/courses`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        semesterId,
        courseCode: 'CS703',
        courseName: 'Machine Learning',
        credits: 4,
        status: 'pending',
      });

    expect(addRes.status).toBe(201);
    expect(addRes.body.data.course.status).toBe('pending');
    expect(addRes.body.data.studentCourse.status).toBe('pending');

    // Pending courses do not earn credits
    let creditsDoc = await Credits.findOne({ student: studentId, semester: semesterId });
    expect(creditsDoc?.earnedCredits ?? 0).toBe(0);

    // 2. Mark course as completed
    const markCompletedRes = await request(app)
      .put(`/api/admin/students/${studentId}/courses/${addRes.body.data.studentCourse._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' });

    expect(markCompletedRes.status).toBe(200);
    expect(markCompletedRes.body.data.studentCourse.status).toBe('completed');

    creditsDoc = await Credits.findOne({ student: studentId, semester: semesterId });
    expect(creditsDoc?.earnedCredits).toBe(4);

    // 3. Mark course back to pending
    const markPendingRes = await request(app)
      .put(`/api/admin/students/${studentId}/courses/${addRes.body.data.studentCourse._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'pending' });

    expect(markPendingRes.status).toBe(200);
    expect(markPendingRes.body.data.studentCourse.status).toBe('pending');

    creditsDoc = await Credits.findOne({ student: studentId, semester: semesterId });
    expect(creditsDoc?.earnedCredits).toBe(0);
  });
});
