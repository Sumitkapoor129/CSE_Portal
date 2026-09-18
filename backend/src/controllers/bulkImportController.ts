import { Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { FacultyProfile } from '../models/FacultyProfile';
import { AuditLog } from '../models/AuditLog';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { seedMilestones } from '../services/milestoneService';
import { UserRole, AuthRequest, StudentType, MilestoneKey, MilestoneStatus, EventType } from '../types';
import { Milestone } from '../models/Milestone';
import { Event } from '../models/Event';

const MAX_IMPORT_ROWS = 2000;
const CONCURRENCY = 4;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(csv|xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new AppError('Only CSV and Excel files are allowed', 400));
    }
  },
});

// ─── Template Download ───────────────────────────────────────────────────────

const STUDENT_TEMPLATE_HEADERS = [
  'email', 'password', 'name', 'collegeId', 'rollNumber',
  'studentType', 'department', 'researchArea', 'admissionDate',
  'requiredCredits', 'phone', 'dateOfBirth', 'gender', 'category',
  'lastDegree', 'institution', 'graduationYear',
  ...Object.values(MilestoneKey).flatMap((k) => [`milestone_${k}`, `milestone_${k}_date`] as const),
];

const STUDENT_TEMPLATE_NOTES: Record<string, string> = {
  email: 'Required. Unique. e.g. scholar@nitjsr.ac.in',
  password: 'Required. Min 6 characters.',
  name: 'Required. Full name of the scholar.',
  collegeId: 'Required. Unique. e.g. 2024PHD001',
  rollNumber: 'Required. Unique. e.g. 22CSP001',
  studentType: 'Required. "frp" (full-time) or "erp" (external).',
  department: 'Required. e.g. CSE',
  researchArea: 'Optional. e.g. Machine Learning',
  admissionDate: 'Optional. YYYY-MM-DD format.',
  requiredCredits: 'Optional. Default is 12. Use 20 for direct-admission PhD.',
  phone: 'Optional. 10-digit phone number.',
  dateOfBirth: 'Optional. YYYY-MM-DD format.',
  gender: 'Optional. e.g. Male, Female, Other',
  category: 'Optional. e.g. General, OBC, SC, ST',
  lastDegree: 'Optional. e.g. M.Tech',
  institution: 'Optional. e.g. IIT Delhi',
  graduationYear: 'Optional. e.g. 2023',
};

Object.values(MilestoneKey).forEach((key) => {
  STUDENT_TEMPLATE_NOTES[`milestone_${key}`] =
    `Optional. Status for "${key.replace(/_/g, ' ')}": pending, in_progress, completed, or skipped. ` +
    'Use with milestone_<key>_date (YYYY-MM-DD) to record the completion date. Blank = pending.';
});

const FACULTY_TEMPLATE_HEADERS = [
  'email', 'password', 'name', 'employeeId', 'department',
  'designation', 'researchAreas',
];

const FACULTY_TEMPLATE_NOTES: Record<string, string> = {
  email: 'Required. Unique. e.g. faculty@nitjsr.ac.in',
  password: 'Required. Min 6 characters.',
  name: 'Required. Full name of the faculty member.',
  employeeId: 'Required. Unique. e.g. FAC001',
  department: 'Required. e.g. CSE',
  designation: 'Required. e.g. Assistant Professor',
  researchAreas: 'Optional. Comma-separated. e.g. AI, NLP, Computer Vision',
};

const EVENT_TEMPLATE_HEADERS = [
  'title', 'eventType', 'date', 'startTime', 'endTime',
  'location', 'description', 'participantEmails',
];

const EVENT_TEMPLATE_NOTES: Record<string, string> = {
  title: 'Required. Title of the event.',
  eventType: `Required. One of: ${Object.values(EventType).join(', ')}.`,
  date: 'Required. Date of the event, YYYY-MM-DD.',
  startTime: 'Required. Start time, YYYY-MM-DD HH:MM (24h).',
  endTime: 'Required. End time, YYYY-MM-DD HH:MM (24h).',
  location: 'Optional. Venue / room.',
  description: 'Optional. Event description.',
  participantEmails: 'Optional. Comma-separated emails of existing students/faculty to invite.',
};

const TEMPLATES: Record<'students' | 'faculty' | 'events', { headers: string[]; notes: Record<string, string>; sheet: string }> = {
  students: { headers: STUDENT_TEMPLATE_HEADERS, notes: STUDENT_TEMPLATE_NOTES, sheet: 'Students' },
  faculty: { headers: FACULTY_TEMPLATE_HEADERS, notes: FACULTY_TEMPLATE_NOTES, sheet: 'Faculty' },
  events: { headers: EVENT_TEMPLATE_HEADERS, notes: EVENT_TEMPLATE_NOTES, sheet: 'Events' },
};

export const downloadTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { type } = req.params;

  const template = TEMPLATES[type as keyof typeof TEMPLATES];
  if (!template) {
    throw new AppError('Template type must be "students", "faculty", or "events"', 400);
  }

  const wb = XLSX.utils.book_new();

  const noteRows = template.headers.map((h) => [h, template.notes[h] || '']);
  const noteWs = XLSX.utils.aoa_to_sheet([['Column', 'Description / Notes'], ...noteRows]);
  noteWs['!cols'] = [{ wch: 20 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, noteWs, 'Instructions');

  const dataWs = XLSX.utils.aoa_to_sheet([template.headers]);
  dataWs['!cols'] = template.headers.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, dataWs, template.sheet);

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', `attachment; filename="${type}_import_template.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseRows(buffer: Buffer): Record<string, unknown>[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new AppError('Spreadsheet is empty', 400);
  const sheet = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: true });
  if (raw.length === 0) throw new AppError('Spreadsheet contains no data rows', 400);
  if (raw.length > MAX_IMPORT_ROWS) {
    throw new AppError(`Spreadsheet has ${raw.length} rows; maximum supported is ${MAX_IMPORT_ROWS}`, 400);
  }
  return raw;
}

// Prevent spreadsheet formula injection (leading =, +, -, @) from being stored.
function cellStr(val: unknown): string {
  return String(val ?? '').trim().replace(/^[=+\-@]+/, '');
}

function cellDate(val: unknown): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date) return val;
  const s = String(val).trim();
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

function friendlyError(err: unknown): string {
  if (err instanceof AppError) return err.message;
  if ((err as { code?: number }).code === 11000) {
    return 'A record with that value already exists';
  }
  return 'Unexpected error';
}

// Runs `fn` over items with a bounded concurrency, awaiting all completions.
async function mapLimit<T>(items: T[], limit: number, fn: (item: T, index: number) => Promise<void>): Promise<void> {
  const queue = items.map((item, index) => ({ item, index }));
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (queue.length) {
      const next = queue.shift();
      if (next) await fn(next.item, next.index);
    }
  });
  await Promise.all(workers);
}

// Synchronously reserves unique values so concurrent import tasks can't race.
// The DB unique indexes remain the cross-request backstop (mapped to friendly errors).
function makeClaimer(existingValues: Set<string>): (values: readonly string[]) => boolean {
  const claimed = new Set<string>();
  return (values) => {
    for (const value of values) {
      if (claimed.has(value) || existingValues.has(value)) return false;
    }
    for (const value of values) claimed.add(value);
    return true;
  };
}

interface RowResult {
  row: number;
  status: 'success' | 'error';
  email?: string;
  name?: string;
  error?: string;
}

interface ImportReport {
  total: number;
  succeeded: number;
  failed: number;
  rows: RowResult[];
}

const newReport = (total: number): ImportReport => ({ total, succeeded: 0, failed: 0, rows: [] });

interface AuditEntry {
  user: string;
  action: string;
  entity: string;
  entityId: string;
  newValue?: Record<string, unknown>;
  timestamp: Date;
}

async function applyMilestoneOverrides(row: Record<string, unknown>, studentId: string, updaterId: string): Promise<void> {
  const validStatuses = new Set(Object.values(MilestoneStatus));
  const writes: Parameters<typeof Milestone.bulkWrite>[0] = [];

  for (const key of Object.values(MilestoneKey)) {
    const statusRaw = cellStr(row[`milestone_${key}`]);
    const dateRaw = row[`milestone_${key}_date`];

    if (!statusRaw && !dateRaw) continue;

    const status = statusRaw.toLowerCase();
    if (status && !validStatuses.has(status as MilestoneStatus)) {
      throw new AppError(`Invalid milestone status "${statusRaw}" for milestone "${key}"`, 400);
    }

    const completedAt = cellDate(dateRaw);
    const finalStatus = (status as MilestoneStatus) || (completedAt ? MilestoneStatus.COMPLETED : undefined);
    const set: Record<string, unknown> = { updatedBy: updaterId };
    if (finalStatus) set.status = finalStatus;
    if (finalStatus === MilestoneStatus.COMPLETED) {
      if (completedAt) set.completedAt = completedAt;
    } else {
      set.completedAt = undefined;
    }

    writes.push({
      updateOne: {
        filter: { student: studentId, key },
        update: { $set: set },
      },
    });
  }

  if (writes.length) {
    await Milestone.bulkWrite(writes);
  }
}

// ─── Student Import ──────────────────────────────────────────────────────────

async function importStudents(rows: Record<string, unknown>[], adminId: string): Promise<ImportReport> {
  const emails = new Set<string>();
  const collegeIds = new Set<string>();
  const rollNumbers = new Set<string>();

  for (const row of rows) {
    if (cellStr(row.email)) emails.add(cellStr(row.email).toLowerCase());
    if (cellStr(row.collegeId)) collegeIds.add(cellStr(row.collegeId).toLowerCase());
    if (cellStr(row.rollNumber)) rollNumbers.add(cellStr(row.rollNumber).toLowerCase());
  }

  const [existingUsers, existingCollege, existingRoll] = await Promise.all([
    User.find({ email: { $in: Array.from(emails) } }).select('email'),
    StudentProfile.find({ collegeId: { $in: Array.from(collegeIds) } }).select('collegeId'),
    StudentProfile.find({ rollNumber: { $in: Array.from(rollNumbers) } }).select('rollNumber'),
  ]);

  const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));
  const existingCollegeIds = new Set(existingCollege.map((p) => p.collegeId.toLowerCase()));
  const existingRollNumbers = new Set(existingRoll.map((p) => p.rollNumber.toLowerCase()));

  const claimEmail = makeClaimer(existingEmails);
  const claimCollege = makeClaimer(existingCollegeIds);
  const claimRoll = makeClaimer(existingRollNumbers);

  const report = newReport(rows.length);
  const results: RowResult[] = new Array(rows.length);
  const auditDocs: AuditEntry[] = [];

  await mapLimit(rows, CONCURRENCY, async (row, index) => {
    const email = cellStr(row.email).toLowerCase();
    const password = cellStr(row.password);
    const name = cellStr(row.name);
    const collegeId = cellStr(row.collegeId);
    const rollNumber = cellStr(row.rollNumber);
    const studentType = cellStr(row.studentType).toLowerCase();

    try {
      if (!email || !password || !name || !collegeId || !rollNumber) {
        throw new AppError('Missing required fields: email, password, name, collegeId, rollNumber', 400);
      }
      if (!email.includes('@')) {
        throw new AppError('Invalid email format', 400);
      }
      if (password.length < 6) {
        throw new AppError('Password must be at least 6 characters', 400);
      }
      if (studentType && !Object.values(StudentType).includes(studentType as StudentType)) {
        throw new AppError('studentType must be "frp" or "erp"', 400);
      }
      if (!claimEmail([email])) {
        throw new AppError('Email already registered', 409);
      }
      if (!claimCollege([collegeId.toLowerCase()])) {
        throw new AppError('College ID already exists', 409);
      }
      if (!claimRoll([rollNumber.toLowerCase()])) {
        throw new AppError('Roll number already exists', 409);
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await User.create({
        email,
        password: hashedPassword,
        name,
        role: UserRole.STUDENT,
        isActive: true,
      });

      try {
        const profileData: Record<string, unknown> = {
          user: user._id,
          collegeId,
          rollNumber,
          studentType: (studentType || 'frp') as StudentType,
          department: cellStr(row.department) || 'CSE',
          researchArea: cellStr(row.researchArea) || '',
          admissionDate: cellDate(row.admissionDate) || new Date(),
        };
        if (row.requiredCredits !== undefined && row.requiredCredits !== '') {
          const rc = Number(row.requiredCredits);
          if (!isNaN(rc) && rc > 0) profileData.requiredCredits = rc;
        }
        if (row.phone) profileData.phone = cellStr(row.phone);
        if (row.dateOfBirth) profileData.dateOfBirth = cellDate(row.dateOfBirth);
        if (row.gender) profileData.gender = cellStr(row.gender);
        if (row.category) profileData.category = cellStr(row.category);
        if (row.lastDegree) profileData.lastDegree = cellStr(row.lastDegree);
        if (row.institution) profileData.institution = cellStr(row.institution);
        if (row.graduationYear) {
          const gy = Number(row.graduationYear);
          if (!isNaN(gy)) profileData.graduationYear = gy;
        }

        const profile = await StudentProfile.create(profileData);
        await seedMilestones(profile._id.toString());
        await applyMilestoneOverrides(row, profile._id.toString(), adminId);

        auditDocs.push({
          user: adminId,
          action: 'BULK_IMPORT_STUDENT',
          entity: 'StudentProfile',
          entityId: profile._id.toString(),
          newValue: { email, name, collegeId, rollNumber } as Record<string, unknown>,
          timestamp: new Date(),
        });
      } catch (err) {
        await User.deleteOne({ _id: user._id }).catch(() => undefined);
        throw err;
      }

      report.succeeded++;
      results[index] = { row: index + 2, status: 'success', email, name };
    } catch (err: unknown) {
      report.failed++;
      results[index] = { row: index + 2, status: 'error', email, name, error: friendlyError(err) };
    }
  });

  report.rows = results;
  if (auditDocs.length) {
    await AuditLog.insertMany(auditDocs);
  }

  return report;
}

// ─── Faculty Import ──────────────────────────────────────────────────────────

async function importFaculty(rows: Record<string, unknown>[], adminId: string): Promise<ImportReport> {
  const emails = new Set<string>();
  const employeeIds = new Set<string>();
  for (const row of rows) {
    if (cellStr(row.email)) emails.add(cellStr(row.email).toLowerCase());
    if (cellStr(row.employeeId)) employeeIds.add(cellStr(row.employeeId).toLowerCase());
  }

  const [existingUsers, existingEmps] = await Promise.all([
    User.find({ email: { $in: Array.from(emails) } }).select('email'),
    FacultyProfile.find({ employeeId: { $in: Array.from(employeeIds) } }).select('employeeId'),
  ]);

  const claimEmail = makeClaimer(new Set(existingUsers.map((u) => u.email.toLowerCase())));
  const claimEmp = makeClaimer(new Set(existingEmps.map((p) => p.employeeId.toLowerCase())));

  const report = newReport(rows.length);
  const results: RowResult[] = new Array(rows.length);
  const auditDocs: AuditEntry[] = [];

  await mapLimit(rows, CONCURRENCY, async (row, index) => {
    const email = cellStr(row.email).toLowerCase();
    const password = cellStr(row.password);
    const name = cellStr(row.name);
    const employeeId = cellStr(row.employeeId);
    const department = cellStr(row.department);
    const designation = cellStr(row.designation);

    try {
      if (!email || !password || !name || !employeeId || !department || !designation) {
        throw new AppError('Missing required fields: email, password, name, employeeId, department, designation', 400);
      }
      if (!email.includes('@')) {
        throw new AppError('Invalid email format', 400);
      }
      if (password.length < 6) {
        throw new AppError('Password must be at least 6 characters', 400);
      }
      if (!claimEmail([email])) {
        throw new AppError('Email already registered', 409);
      }
      if (!claimEmp([employeeId.toLowerCase()])) {
        throw new AppError('Employee ID already exists', 409);
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await User.create({
        email,
        password: hashedPassword,
        name,
        role: UserRole.SUPERVISOR,
        isActive: true,
      });

      try {
        const researchAreas = row.researchAreas
          ? cellStr(row.researchAreas).split(',').map((s: string) => s.trim()).filter(Boolean)
          : [];

        const profile = await FacultyProfile.create({
          user: user._id,
          employeeId,
          department,
          designation,
          researchAreas,
        });

        auditDocs.push({
          user: adminId,
          action: 'BULK_IMPORT_FACULTY',
          entity: 'FacultyProfile',
          entityId: profile._id.toString(),
          newValue: { email, name, employeeId, department, designation } as Record<string, unknown>,
          timestamp: new Date(),
        });
      } catch (err) {
        await User.deleteOne({ _id: user._id }).catch(() => undefined);
        throw err;
      }

      report.succeeded++;
      results[index] = { row: index + 2, status: 'success', email, name };
    } catch (err: unknown) {
      report.failed++;
      results[index] = { row: index + 2, status: 'error', email, name, error: friendlyError(err) };
    }
  });

  report.rows = results;
  if (auditDocs.length) {
    await AuditLog.insertMany(auditDocs);
  }

  return report;
}

// ─── Events Import ───────────────────────────────────────────────────────────

async function importEvents(rows: Record<string, unknown>[], adminId: string): Promise<ImportReport> {
  const allEmails = new Set<string>();
  for (const row of rows) {
    cellStr(row.participantEmails).split(',').forEach((e: string) => {
      const email = e.trim().toLowerCase();
      if (email) allEmails.add(email);
    });
  }

  const participantLookup = new Map<string, string>();
  if (allEmails.size) {
    const users = await User.find({ email: { $in: Array.from(allEmails) } }).select('_id email');
    for (const u of users) participantLookup.set(u.email.toLowerCase(), String(u._id));
  }

  const report = newReport(rows.length);
  const results: RowResult[] = new Array(rows.length);
  const auditDocs: AuditEntry[] = [];

  await mapLimit(rows, CONCURRENCY, async (row, index) => {
    const title = cellStr(row.title);

    try {
      const eventType = cellStr(row.eventType).toLowerCase();
      if (!title || !eventType || !cellStr(row.date) || !cellStr(row.startTime) || !cellStr(row.endTime)) {
        throw new AppError('Missing required fields: title, eventType, date, startTime, endTime', 400);
      }
      if (!Object.values(EventType).includes(eventType as EventType)) {
        throw new AppError(`Invalid eventType. Use one of: ${Object.values(EventType).join(', ')}`, 400);
      }

      const date = new Date(cellStr(row.date));
      const startTime = new Date(cellStr(row.startTime));
      const endTime = new Date(cellStr(row.endTime));
      if (isNaN(date.getTime()) || isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        throw new AppError('Invalid date or time format. Use YYYY-MM-DD / YYYY-MM-DD HH:MM', 400);
      }
      if (endTime <= startTime) {
        throw new AppError('endTime must be after startTime', 400);
      }

      const participantEmails = cellStr(row.participantEmails)
        .split(',')
        .map((s: string) => s.trim().toLowerCase())
        .filter(Boolean);

      const missing = participantEmails.filter((e) => !participantLookup.has(e));
      if (missing.length) {
        throw new AppError(`Unknown participant emails: ${missing.join(', ')}`, 400);
      }

      const participantDocs = participantEmails.map((e) => ({
        participant: participantLookup.get(e) as string,
        participantModel: 'User' as const,
      }));

      const event = await Event.create({
        title,
        eventType: eventType as EventType,
        description: cellStr(row.description),
        date,
        startTime,
        endTime,
        location: cellStr(row.location),
        organizer: adminId,
        organizerModel: 'User',
        participants: participantDocs,
      });

      auditDocs.push({
        user: adminId,
        action: 'BULK_IMPORT_EVENT',
        entity: 'Event',
        entityId: event._id.toString(),
        newValue: { title, eventType, date: cellStr(row.date) } as Record<string, unknown>,
        timestamp: new Date(),
      });

      report.succeeded++;
      results[index] = { row: index + 2, status: 'success' };
    } catch (err: unknown) {
      report.failed++;
      results[index] = { row: index + 2, status: 'error', error: friendlyError(err) };
    }
  });

  report.rows = results;
  if (auditDocs.length) {
    await AuditLog.insertMany(auditDocs);
  }

  return report;
}

// ─── Bulk Import Endpoint ────────────────────────────────────────────────────

export const bulkImport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { type } = req.params;

  if (type !== 'students' && type !== 'faculty' && type !== 'events') {
    throw new AppError('Import type must be "students", "faculty", or "events"', 400);
  }

  if (!req.file) {
    throw new AppError('Please upload a CSV or Excel file', 400);
  }

  const rows = parseRows(req.file.buffer);

  const report =
    type === 'students' ? await importStudents(rows, req.user!.id)
    : type === 'faculty' ? await importFaculty(rows, req.user!.id)
    : await importEvents(rows, req.user!.id);

  res.status(200).json({
    success: true,
    data: {
      type,
      ...report,
    },
  });
});