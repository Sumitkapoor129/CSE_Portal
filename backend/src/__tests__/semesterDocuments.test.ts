import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { testApp as app } from './testApp';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { FacultyProfile } from '../models/FacultyProfile';
import { StudentProfile } from '../models/StudentProfile';
import { DocumentModel } from '../models/Document';
import {
  calculateCurrentSemester,
  calculateSemesterDates,
  getAllSemestersUpToCurrent,
} from '../utils/semester';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('Semester Calculation Logic', () => {
  it('correctly calculates semester dates and current semester according to 6-month rule', () => {
    const admissionDate = new Date('2025-07-15T00:00:00.000Z');

    // Test semester dates
    const sem1Dates = calculateSemesterDates(admissionDate, 1);
    expect(sem1Dates.startDate.getUTCFullYear()).toBe(2025);
    expect(sem1Dates.startDate.getUTCMonth()).toBe(6); // July (0-indexed)
    expect(sem1Dates.startDate.getUTCDate()).toBe(15);

    expect(sem1Dates.endDate.getUTCFullYear()).toBe(2026);
    expect(sem1Dates.endDate.getUTCMonth()).toBe(0); // January
    expect(sem1Dates.endDate.getUTCDate()).toBe(14);

    const sem2Dates = calculateSemesterDates(admissionDate, 2);
    expect(sem2Dates.startDate.getUTCFullYear()).toBe(2026);
    expect(sem2Dates.startDate.getUTCMonth()).toBe(0); // January
    expect(sem2Dates.startDate.getUTCDate()).toBe(15);

    expect(sem2Dates.endDate.getUTCFullYear()).toBe(2026);
    expect(sem2Dates.endDate.getUTCMonth()).toBe(6); // July
    expect(sem2Dates.endDate.getUTCDate()).toBe(14);

    const sem3Dates = calculateSemesterDates(admissionDate, 3);
    expect(sem3Dates.startDate.getUTCFullYear()).toBe(2026);
    expect(sem3Dates.startDate.getUTCMonth()).toBe(6); // July
    expect(sem3Dates.startDate.getUTCDate()).toBe(15);

    expect(sem3Dates.endDate.getUTCFullYear()).toBe(2027);
    expect(sem3Dates.endDate.getUTCMonth()).toBe(0); // January
    expect(sem3Dates.endDate.getUTCDate()).toBe(14);

    // Test current semester calculation at various dates
    expect(calculateCurrentSemester(admissionDate, new Date('2025-07-15T10:00:00.000Z'))).toBe(1);
    expect(calculateCurrentSemester(admissionDate, new Date('2026-01-14T23:59:59.000Z'))).toBe(1);
    expect(calculateCurrentSemester(admissionDate, new Date('2026-01-15T00:00:00.000Z'))).toBe(2);
    expect(calculateCurrentSemester(admissionDate, new Date('2026-07-14T12:00:00.000Z'))).toBe(2);
    expect(calculateCurrentSemester(admissionDate, new Date('2026-07-15T00:00:00.000Z'))).toBe(3);
    expect(calculateCurrentSemester(admissionDate, new Date('2027-01-15T00:00:00.000Z'))).toBe(4);
  });

  it('handles missing or invalid admission dates gracefully', () => {
    expect(calculateCurrentSemester(null)).toBe(1);
    expect(calculateCurrentSemester(undefined)).toBe(1);
    expect(calculateCurrentSemester('invalid-date')).toBe(1);
  });

  it('generates all semesters up to current semester', () => {
    const admissionDate = new Date('2025-07-15T00:00:00.000Z');
    const asOfSem3 = new Date('2026-08-01T00:00:00.000Z');
    const sems = getAllSemestersUpToCurrent(admissionDate, asOfSem3);
    expect(sems.length).toBe(3);
    expect(sems[0].semesterNumber).toBe(1);
    expect(sems[0].isCurrent).toBe(false);
    expect(sems[1].semesterNumber).toBe(2);
    expect(sems[1].isCurrent).toBe(false);
    expect(sems[2].semesterNumber).toBe(3);
    expect(sems[2].isCurrent).toBe(true);
  });
});

describe('Semester-wise Document Management API', () => {
  let studentToken: string;
  let otherStudentToken: string;
  let studentProfileId: string;

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      FacultyProfile.deleteMany({}),
      StudentProfile.deleteMany({}),
      DocumentModel.deleteMany({}),
    ]);

    // Create supervisor faculty
    const facUser = await User.create({
      email: 'supervisor@college.edu',
      password: await bcrypt.hash('secret123', 10),
      name: 'Dr. Supervisor',
      role: 'supervisor',
      isActive: true,
    });
    const supervisorProfile = await FacultyProfile.create({
      user: facUser._id,
      department: 'CSE',
      designation: 'Professor',
      employeeId: 'EMP001',
    });

    // Create student 1 (admitted 14 months ago -> currently Semester 3)
    const stuUser = await User.create({
      email: 'student1@college.edu',
      password: await bcrypt.hash('secret123', 10),
      name: 'Student One',
      role: 'student',
      isActive: true,
    });
    const admissionDate1 = new Date();
    admissionDate1.setMonth(admissionDate1.getMonth() - 14); // 14 months ago -> Sem 3

    const stuProfile = await StudentProfile.create({
      user: stuUser._id,
      collegeId: 'STU101',
      rollNumber: 'R101',
      studentType: 'frp',
      program: 'phd',
      department: 'CSE',
      admissionDate: admissionDate1,
      supervisor: supervisorProfile._id,
    });
    studentProfileId = stuProfile._id.toString();

    // Create student 2
    const stuUser2 = await User.create({
      email: 'student2@college.edu',
      password: await bcrypt.hash('secret123', 10),
      name: 'Student Two',
      role: 'student',
      isActive: true,
    });
    await StudentProfile.create({
      user: stuUser2._id,
      collegeId: 'STU102',
      rollNumber: 'R102',
      studentType: 'frp',
      program: 'phd',
      department: 'CSE',
      admissionDate: new Date(),
      supervisor: supervisorProfile._id,
    });

    // Login tokens
    const res1 = await request(app).post('/api/auth/login').send({
      email: 'student1@college.edu',
      password: 'secret123',
    });
    studentToken = res1.body.data.accessToken;

    const res2 = await request(app).post('/api/auth/login').send({
      email: 'student2@college.edu',
      password: 'secret123',
    });
    otherStudentToken = res2.body.data.accessToken;
  });

  it('allows uploading a document to a valid semester and defaults to current semester if omitted', async () => {
    // 1. Upload without explicit semesterNumber -> defaults to current semester (3)
    const resDefault = await request(app)
      .post('/api/student/documents')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        documentName: 'Registration Form',
        documentType: 'Form',
        fileUrl: 'https://example.com/reg.pdf',
      });

    expect(resDefault.status).toBe(201);
    expect(resDefault.body.success).toBe(true);
    expect(resDefault.body.data.semesterNumber).toBe(3);

    // 2. Upload to a previous semester (Semester 1)
    const resSem1 = await request(app)
      .post('/api/student/documents')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        documentName: 'Course Plan',
        documentType: 'Plan',
        fileUrl: 'https://example.com/plan.pdf',
        semesterNumber: 1,
      });

    expect(resSem1.status).toBe(201);
    expect(resSem1.body.data.semesterNumber).toBe(1);
  });

  it('rejects uploading a document to a future semester with 400', async () => {
    // Student 1 is in Semester 3; attempting to upload to Semester 4 must be rejected
    const resFuture = await request(app)
      .post('/api/student/documents')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        documentName: 'Future Thesis Draft',
        documentType: 'Thesis',
        fileUrl: 'https://example.com/thesis.pdf',
        semesterNumber: 4,
      });

    expect(resFuture.status).toBe(400);
    expect(resFuture.body.message).toMatch(/Cannot upload documents to future semester/i);
  });

  it('supports multipart file upload and attaches size and mimeType', async () => {
    const fileBuffer = Buffer.from('%PDF-1.4 Mock PDF content');

    const resUpload = await request(app)
      .post('/api/student/documents')
      .set('Authorization', `Bearer ${studentToken}`)
      .field('documentName', 'Uploaded Report')
      .field('documentType', 'Report')
      .field('semesterNumber', '2')
      .attach('file', fileBuffer, 'report.pdf');

    expect(resUpload.status).toBe(201);
    expect(resUpload.body.data.documentName).toBe('Uploaded Report');
    expect(resUpload.body.data.semesterNumber).toBe(2);
    expect(resUpload.body.data.fileUrl).toMatch(/^\/uploads\/documents\//);
    expect(resUpload.body.data.fileSize).toBeGreaterThan(0);
    expect(resUpload.body.data.mimeType).toBe('application/pdf');
  });

  it('returns documents grouped by semester with currentSemester metadata in GET', async () => {
    // Seed documents
    await DocumentModel.create({
      student: studentProfileId,
      documentName: 'Doc Sem 1',
      documentType: 'Report',
      fileUrl: 'https://example.com/d1.pdf',
      semesterNumber: 1,
      uploadedBy: new mongoose.Types.ObjectId(),
    });
    await DocumentModel.create({
      student: studentProfileId,
      documentName: 'Doc Sem 3',
      documentType: 'Report',
      fileUrl: 'https://example.com/d3.pdf',
      semesterNumber: 3,
      uploadedBy: new mongoose.Types.ObjectId(),
    });

    const res = await request(app)
      .get('/api/student/documents')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.meta.currentSemester).toBe(3);
    expect(res.body.data[0].semesterNumber).toBeDefined();
  });

  it('allows owner to delete their document and prevents other students from deleting it', async () => {
    const doc = await DocumentModel.create({
      student: studentProfileId,
      documentName: 'My Document',
      documentType: 'Draft',
      fileUrl: 'https://example.com/doc.pdf',
      semesterNumber: 2,
      uploadedBy: new mongoose.Types.ObjectId(),
    });

    // Other student tries to delete
    const resOther = await request(app)
      .delete(`/api/student/documents/${doc._id}`)
      .set('Authorization', `Bearer ${otherStudentToken}`);

    expect(resOther.status).toBe(404);

    // Owner deletes
    const resOwner = await request(app)
      .delete(`/api/student/documents/${doc._id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(resOwner.status).toBe(200);
    expect(resOwner.body.data.message).toMatch(/deleted successfully/i);

    // Verify removed from database
    const check = await DocumentModel.findById(doc._id);
    expect(check).toBeNull();
  });
});
