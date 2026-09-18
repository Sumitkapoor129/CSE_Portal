import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import { testApp as app } from './testApp';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { FacultyProfile } from '../models/FacultyProfile';
import { Milestone } from '../models/Milestone';
import { Event } from '../models/Event';

let mongo: MongoMemoryServer;
let adminToken: string;

const xlsxBuffer = (rows: Record<string, unknown>[]): Buffer => {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows.map((r) => headers.map((h) => r[h] ?? ''))]);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const admin = await User.create({
    email: 'admin@college.edu',
    password: await bcrypt.hash('admin123', 12),
    name: 'Admin',
    role: 'admin',
    isActive: true,
  });
  const login = await request(app).post('/api/auth/login').send({ email: 'admin@college.edu', password: 'admin123' });
  adminToken = login.body.data.accessToken;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({ email: { $ne: 'admin@college.edu' } }),
    StudentProfile.deleteMany({}),
    FacultyProfile.deleteMany({}),
    Milestone.deleteMany({}),
    Event.deleteMany({}),
  ]);
});

const auth = () => ({ Authorization: `Bearer ${adminToken}` });

describe('Bulk Import', () => {
it('downloads student template as xlsx', async () => {
    const res = await request(app)
      .get('/api/admin/bulk-import/template/students')
      .set(auth())
      .parse((response, callback) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    const wb = XLSX.read(res.body, { type: 'buffer' });
    expect(wb.SheetNames).toContain('Students');
    expect(wb.SheetNames).toContain('Instructions');
  });

  it('downloads faculty and events templates', async () => {
    const [fac, ev] = await Promise.all([
      request(app).get('/api/admin/bulk-import/template/faculty').set(auth()),
      request(app).get('/api/admin/bulk-import/template/events').set(auth()),
    ]);
    expect(fac.status).toBe(200);
    expect(ev.status).toBe(200);
  });

  it('rejects invalid template type', async () => {
    const res = await request(app).get('/api/admin/bulk-import/template/junk').set(auth());
    expect(res.status).toBe(400);
  });

  it('requires an uploaded file', async () => {
    const res = await request(app).post('/api/admin/bulk-import/students').set(auth());
    expect(res.status).toBe(400);
  });

  it('imports students and seeds default milestones', async () => {
    const buf = xlsxBuffer([
      {
        email: 's1@college.edu', password: 'secret123', name: 'Student One',
        collegeId: 'CSE1001', rollNumber: '22CS1001', studentType: 'frp',
        department: 'CSE',
      },
      {
        email: 's2@college.edu', password: 'secret123', name: 'Student Two',
        collegeId: 'CSE1002', rollNumber: '22CS1002', studentType: 'erp',
        department: 'CSE',
      },
    ]);
    const res = await request(app)
      .post('/api/admin/bulk-import/students')
      .set(auth())
      .attach('file', buf, { filename: 'students.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    expect(res.status).toBe(200);
    expect(res.body.data.succeeded).toBe(2);
    expect(res.body.data.failed).toBe(0);
    expect(await User.countDocuments({ role: 'student' })).toBe(2);
    expect(await StudentProfile.countDocuments({})).toBe(2);
    expect(await Milestone.countDocuments({})).toBe(22);
  });

it('applies milestone overrides for a previous student', async () => {
    const buf = xlsxBuffer([
      {
        email: 'old@college.edu', password: 'secret123', name: 'Old Student',
        collegeId: 'CSE2001', rollNumber: '20CS2001', studentType: 'frp',
        department: 'CSE', milestone_admission: 'completed',
        milestone_admission_date: '2021-01-10', milestone_course_work: 'in_progress',
      },
    ]);
    const res = await request(app)
      .post('/api/admin/bulk-import/students')
      .set(auth())
      .attach('file', buf, { filename: 'students.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    expect(res.status).toBe(200);
    const profile = await StudentProfile.findOne({ collegeId: 'CSE2001' });
    const admission = await Milestone.findOne({ student: profile!._id, key: 'admission' });
    const courseWork = await Milestone.findOne({ student: profile!._id, key: 'course_work' });
    expect(admission!.status).toBe('completed');
    expect(admission!.completedAt).toBeInstanceOf(Date);
    expect(courseWork!.status).toBe('in_progress');
  });

  it('reports row-level failures and keeps successes', async () => {
    const dup = await User.create({
      email: 'dup@college.edu', password: await bcrypt.hash('secret123', 12),
      name: 'Existing', role: 'student', isActive: true,
    });
    const buf = xlsxBuffer([
      {
        email: 'new@college.edu', password: 'secret123', name: 'New Student',
        collegeId: 'CSE3001', rollNumber: '22CS3001', studentType: 'frp',
        department: 'CSE',
      },
      {
        email: 'dup@college.edu', password: 'secret123', name: 'Duplicate',
        collegeId: 'CSE3002', rollNumber: '22CS3002', studentType: 'frp',
        department: 'CSE',
      },
    ]);
    const res = await request(app)
      .post('/api/admin/bulk-import/students')
      .set(auth())
      .attach('file', buf, { filename: 'students.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    expect(res.body.data.succeeded).toBe(1);
    expect(res.body.data.failed).toBe(1);
    const failedRow = res.body.data.rows.find((r: { email: string }) => r.email === 'dup@college.edu');
    expect(failedRow.error).toContain('Email already registered');
    expect(dup).toBeTruthy();
  });

  it('imports faculty', async () => {
    const buf = xlsxBuffer([
      {
        email: 'f1@college.edu', password: 'secret123', name: 'Prof A',
        employeeId: 'FAC001', department: 'CSE', designation: 'Professor',
        researchAreas: 'AI, ML',
      },
    ]);
    const res = await request(app)
      .post('/api/admin/bulk-import/faculty')
      .set(auth())
      .attach('file', buf, { filename: 'faculty.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    expect(res.status).toBe(200);
    expect(res.body.data.succeeded).toBe(1);
    const faculty = await FacultyProfile.findOne({ employeeId: 'FAC001' });
    expect(faculty!.researchAreas).toEqual(['AI', 'ML']);
    expect(faculty!.user).toBeTruthy();
  });

  it('imports events with participant enrollment', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'part@college.edu', password: 'secret123', name: 'Participant',
        collegeId: 'CSE4001', rollNumber: '22CS4001', studentType: 'frp', department: 'CSE',
      });
    const buf = xlsxBuffer([
      {
        title: 'Seminar 1', eventType: 'seminar',
        date: '2026-01-10', startTime: '2026-01-10 10:00', endTime: '2026-01-10 12:00',
        location: 'Room 101', description: 'Opening seminar', participantEmails: 'part@college.edu',
      },
    ]);
    const res = await request(app)
      .post('/api/admin/bulk-import/events')
      .set(auth())
      .attach('file', buf, { filename: 'events.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    expect(res.status).toBe(200);
    expect(res.body.data.succeeded).toBe(1);
    const event = await Event.findOne({ title: 'Seminar 1' });
    expect(event!.participants).toHaveLength(1);
  });

  it('rejects events with unknown participant emails', async () => {
    const buf = xlsxBuffer([
      {
        title: 'Bad Event', eventType: 'seminar',
        date: '2026-01-10', startTime: '2026-01-10 10:00', endTime: '2026-01-10 12:00',
        participantEmails: 'nobody@nowhere.org',
      },
    ]);
    const res = await request(app)
      .post('/api/admin/bulk-import/events')
      .set(auth())
      .attach('file', buf, { filename: 'events.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    expect(res.body.data.failed).toBe(1);
    expect(res.body.data.rows[0].error).toContain('Unknown participant emails');
  });
});
