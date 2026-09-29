import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { FacultyProfile } from '../models/FacultyProfile';
import { Supervisor } from '../models/Supervisor';
import { SRCCommittee } from '../models/SRCCommittee';
import { Event } from '../models/Event';
import { Form } from '../models/Form';
import { Deadline } from '../models/Deadline';
import { ApprovalRequest } from '../models/ApprovalRequest';
import { Course } from '../models/Course';
import { StudentCourse } from '../models/StudentCourse';
import { Semester } from '../models/Semester';
import { Credits } from '../models/Credits';
import { computeCreditsForSemester } from '../services/creditService';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { createAuditLog } from '../utils/audit';
import { createNotification, createBulkNotifications } from '../utils/notify';
import { Milestone } from '../models/Milestone';
import { ExternalExaminer } from '../models/ExternalExaminer';
import { Internship } from '../models/Internship';
import { seedMilestones, getMilestones, updateMilestone as updateMilestoneService, applyAdmissionDate } from '../services/milestoneService';
import { ensureMilestoneRemindersForStudent } from '../services/reminderService';
import { getAdminDepartmentDues } from '../services/ordinanceTimelineService';
import { resolveParticipants, parseEventDateTime } from '../utils/participants';
import { sendNotificationEmail } from '../utils/email';
import { escapeRegex } from '../utils/query';
import { paginate } from '../utils/pagination';
import {
  UserRole,
  AuthRequest,
  ApprovalStatus,
  SRCMemberRole,
  ExternalExaminerStatus,
  ExaminerCategory,
  InternshipStatus,
} from '../types';

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const getDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const [totalStudents, totalFaculty, totalEvents, pendingApprovals, departmentDues] = await Promise.all([
    User.countDocuments({ role: UserRole.STUDENT }),
    User.countDocuments({ role: UserRole.SUPERVISOR }),
    Event.countDocuments(),
    ApprovalRequest.countDocuments({ status: ApprovalStatus.PENDING }),
    getAdminDepartmentDues(),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalStudents,
      totalFaculty,
      totalEvents,
      pendingApprovals,
      departmentDues,
    },
  });
});

// ─── Student Management ──────────────────────────────────────────────────────

export const createStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, password, name, collegeId, rollNumber, studentType, program, department, researchArea, admissionDate, requiredCredits } = req.body;

  if (!email || !password || !name || !collegeId || !rollNumber || !studentType || !department) {
    throw new AppError('All required fields must be provided', 400);
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('Email already registered', 409);
  }

  const existingCollege = await StudentProfile.findOne({ collegeId });
  if (existingCollege) {
    throw new AppError('College ID already exists', 409);
  }

  const existingRoll = await StudentProfile.findOne({ rollNumber });
  if (existingRoll) {
    throw new AppError('Roll number already exists', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    email: email.toLowerCase(),
    password: hashedPassword,
    name,
    role: UserRole.STUDENT,
    isActive: true,
  });

  const profile = await StudentProfile.create({
    user: user._id,
    collegeId,
    rollNumber,
    studentType,
    program: program || 'phd',
    department,
    researchArea: researchArea || '',
    admissionDate: admissionDate || new Date(),
    requiredCredits: requiredCredits || undefined,
  });

  await seedMilestones(profile._id.toString());
  if (admissionDate) {
    await applyAdmissionDate(profile._id.toString(), new Date(profile.admissionDate));
  }
  await ensureMilestoneRemindersForStudent(profile._id.toString(), user._id.toString());

  await createAuditLog({
    user: req.user!.id,
    action: 'CREATE_STUDENT',
    entity: 'StudentProfile',
    entityId: profile._id.toString(),
    newValue: { email, name, collegeId, rollNumber, studentType, program: profile.program, department } as Record<string, unknown>,
  });

  res.status(201).json({
    success: true,
    data: {
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      profile,
    },
  });
});

export const updateStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const profile = await StudentProfile.findById(id);
  if (!profile) {
    throw new AppError('Student profile not found', 404);
  }

  const previousValue = profile.toObject() as unknown as Record<string, unknown>;

  const allowedFields = ['collegeId', 'rollNumber', 'studentType', 'program', 'department', 'researchArea', 'profilePhoto'];
  const sanitizedUpdates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      sanitizedUpdates[field] = updates[field];
    }
  }

  if (updates.name || updates.email) {
    const userUpdates: Record<string, unknown> = {};
    if (updates.name) userUpdates.name = updates.name;
    if (updates.email) userUpdates.email = updates.email.toLowerCase();
    await User.findByIdAndUpdate(profile.user, userUpdates);
  }

  Object.assign(profile, sanitizedUpdates);
  await profile.save();

  await createAuditLog({
    user: req.user!.id,
    action: 'UPDATE_STUDENT',
    entity: 'StudentProfile',
    entityId: id,
    previousValue,
    newValue: sanitizedUpdates,
  });

  res.status(200).json({ success: true, data: profile });
});

export const toggleStudentActive = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user || user.role !== UserRole.STUDENT) {
    throw new AppError('Student not found', 404);
  }

  user.isActive = !user.isActive;
  await user.save();

  await createAuditLog({
    user: req.user!.id,
    action: user.isActive ? 'ACTIVATE_STUDENT' : 'DEACTIVATE_STUDENT',
    entity: 'User',
    entityId: id,
    newValue: { isActive: user.isActive } as Record<string, unknown>,
  });

  await createNotification({
    user: id,
    title: user.isActive ? 'Account Activated' : 'Account Deactivated',
    message: user.isActive
      ? 'Your account has been activated by the administrator.'
      : 'Your account has been deactivated by the administrator.',
    type: 'account_status',
  });

  res.status(200).json({
    success: true,
    data: { id: user._id, isActive: user.isActive },
  });
});

export const listStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const { search, studentType, department, fields } = req.query;

  const filter: Record<string, unknown> = {};
  if (studentType) filter.studentType = studentType;
  if (department) filter.department = department;

  if (search) {
    const safeSearch = (search as string).slice(0, 100);
    const regex = new RegExp(escapeRegex(safeSearch), 'i');
    const matchingUsers = await User.find({
      role: UserRole.STUDENT,
      $or: [{ name: regex }, { email: regex }],
    }).select('_id');
    const userIds = matchingUsers.map((u) => u._id);

    filter.$or = [
      { user: { $in: userIds } },
      { collegeId: regex },
      { rollNumber: regex },
    ];
  }

  const fieldList = fields ? (fields as string).split(',').map(f => f.trim()).filter(Boolean) : undefined;
  const projection = fieldList ? fieldList.join(' ') : undefined;

  const query = StudentProfile.find(filter)
    .populate('user', 'name email')
    .populate({
      path: 'supervisor',
      select: 'employeeId department designation user',
      populate: { path: 'user', select: 'name email' },
    })
    .populate({
      path: 'coSupervisor',
      select: 'employeeId department designation user',
      populate: { path: 'user', select: 'name email' },
    });
  if (projection) {
    query.select(projection);
  }

  const total = await StudentProfile.countDocuments(filter);
  const skip = (page - 1) * limit;
  const data = await query.sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

  res.status(200).json({
    success: true,
    data: {
      students: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

// ─── Faculty Management ──────────────────────────────────────────────────────

export const createFaculty = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, password, name, employeeId, department, designation, researchAreas, isHod } = req.body;

  if (!email || !password || !name || !employeeId || !department || !designation) {
    throw new AppError('All required fields must be provided', 400);
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('Email already registered', 409);
  }

  const existingEmp = await FacultyProfile.findOne({ employeeId });
  if (existingEmp) {
    throw new AppError('Employee ID already exists', 409);
  }

  if (isHod) {
    // Only 1 person can be the HOD at any time; unset any existing HOD
    await FacultyProfile.updateMany({ isHod: true }, { isHod: false });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    email: email.toLowerCase(),
    password: hashedPassword,
    name,
    role: UserRole.SUPERVISOR,
    isActive: true,
  });

  const profile = await FacultyProfile.create({
    user: user._id,
    employeeId,
    department,
    designation,
    isHod: Boolean(isHod),
    researchAreas: researchAreas || [],
  });

  await createAuditLog({
    user: req.user!.id,
    action: 'CREATE_FACULTY',
    entity: 'FacultyProfile',
    entityId: profile._id.toString(),
    newValue: { email, name, employeeId, department, designation, isHod: profile.isHod } as Record<string, unknown>,
  });

  res.status(201).json({
    success: true,
    data: {
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      profile,
    },
  });
});

export const updateFaculty = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const profile = await FacultyProfile.findById(id);
  if (!profile) {
    throw new AppError('Faculty profile not found', 404);
  }

  const previousValue = profile.toObject() as unknown as Record<string, unknown>;

  const allowedFields = ['employeeId', 'department', 'designation', 'researchAreas', 'profilePhoto', 'isHod'];
  const sanitizedUpdates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      sanitizedUpdates[field] = updates[field];
    }
  }

  if (updates.isHod === true) {
    // Only 1 person can be HOD - unset on all others
    await FacultyProfile.updateMany({ _id: { $ne: profile._id }, isHod: true }, { isHod: false });
    sanitizedUpdates.isHod = true;
  } else if (updates.isHod === false) {
    sanitizedUpdates.isHod = false;
  }

  if (updates.name || updates.email) {
    const userUpdates: Record<string, unknown> = {};
    if (updates.name) userUpdates.name = updates.name;
    if (updates.email) userUpdates.email = updates.email.toLowerCase();
    await User.findByIdAndUpdate(profile.user, userUpdates);
  }

  Object.assign(profile, sanitizedUpdates);
  await profile.save();

  await createAuditLog({
    user: req.user!.id,
    action: 'UPDATE_FACULTY',
    entity: 'FacultyProfile',
    entityId: id,
    previousValue,
    newValue: sanitizedUpdates,
  });

  res.status(200).json({ success: true, data: profile });
});

export const toggleFacultyActive = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user || user.role !== UserRole.SUPERVISOR) {
    throw new AppError('Faculty not found', 404);
  }

  user.isActive = !user.isActive;
  await user.save();

  await createAuditLog({
    user: req.user!.id,
    action: user.isActive ? 'ACTIVATE_FACULTY' : 'DEACTIVATE_FACULTY',
    entity: 'User',
    entityId: id,
    newValue: { isActive: user.isActive } as Record<string, unknown>,
  });

  await createNotification({
    user: id,
    title: user.isActive ? 'Account Activated' : 'Account Deactivated',
    message: user.isActive
      ? 'Your account has been activated by the administrator.'
      : 'Your account has been deactivated by the administrator.',
    type: 'account_status',
  });

  res.status(200).json({
    success: true,
    data: { id: user._id, isActive: user.isActive },
  });
});

export const listFaculty = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const { search, department, fields } = req.query;

  const filter: Record<string, unknown> = {};
  if (department) filter.department = department;

  if (search) {
    const safeSearch = (search as string).slice(0, 100);
    const regex = new RegExp(escapeRegex(safeSearch), 'i');
    const matchingUsers = await User.find({
      role: UserRole.SUPERVISOR,
      $or: [{ name: regex }, { email: regex }],
    }).select('_id');
    const userIds = matchingUsers.map((u) => u._id);

    filter.$or = [
      { user: { $in: userIds } },
      { employeeId: regex },
    ];
  }

  const fieldList = fields ? (fields as string).split(',').map(f => f.trim()).filter(Boolean) : undefined;
  const projection = fieldList ? fieldList.join(' ') : undefined;

  const query = FacultyProfile.find(filter).populate('user', 'name email');
  if (projection) {
    query.select(projection);
  }

  const total = await FacultyProfile.countDocuments(filter);
  const skip = (page - 1) * limit;
  const data = await query.sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

  res.status(200).json({
    success: true,
    data: {
      faculty: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

// ─── Supervisor Assignment ───────────────────────────────────────────────────

export const assignSupervisor = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId, supervisorId, coSupervisorId } = req.body;

  if (!studentId || !supervisorId) {
    throw new AppError('studentId and supervisorId are required', 400);
  }

  let studentProfile = await StudentProfile.findById(studentId);
  if (!studentProfile) {
    studentProfile = await StudentProfile.findOne({ user: studentId });
  }
  if (!studentProfile) {
    throw new AppError('Student profile not found', 404);
  }

  let supervisorProfile = await FacultyProfile.findById(supervisorId);
  if (!supervisorProfile) {
    supervisorProfile = await FacultyProfile.findOne({ user: supervisorId });
  }
  if (!supervisorProfile) {
    throw new AppError('Supervisor profile not found', 404);
  }

  let coProfile: any = null;
  if (coSupervisorId) {
    coProfile = await FacultyProfile.findById(coSupervisorId);
    if (!coProfile) {
      coProfile = await FacultyProfile.findOne({ user: coSupervisorId });
    }
    if (!coProfile) {
      throw new AppError('Co-supervisor profile not found', 404);
    }
  }

  const supervisorRecord = await Supervisor.findOneAndUpdate(
    { student: studentProfile._id },
    {
      supervisor: supervisorProfile._id,
      coSupervisor: coProfile ? coProfile._id : undefined,
      assignedDate: new Date(),
      isActive: true,
    },
    { upsert: true, new: true }
  );

  studentProfile.supervisor = supervisorProfile._id.toString();
  studentProfile.coSupervisor = coProfile ? coProfile._id.toString() : undefined;
  await studentProfile.save();

  await createAuditLog({
    user: req.user!.id,
    action: 'ASSIGN_SUPERVISOR',
    entity: 'Supervisor',
    entityId: supervisorRecord._id.toString(),
    newValue: { studentId, supervisorId, coSupervisorId } as Record<string, unknown>,
  });

  await createNotification({
    user: studentProfile.user.toString(),
    title: 'Supervisor Assigned',
    message: `A new supervisor has been assigned to you.`,
    type: 'supervisor_assigned',
  });

  res.status(201).json({ success: true, data: supervisorRecord });
});

// ─── SRC Committee ───────────────────────────────────────────────────────────

const validateSRCMembers = async (members: Array<{ role: string; faculty: string }>, studentId: string): Promise<void> => {
  const hodFaculty = await FacultyProfile.findOne({ isHod: true });
  if (!hodFaculty) {
    throw new AppError('No HOD found in system. Please designate a Faculty as HOD in Faculty Management before creating or updating an SRC committee.', 400);
  }

  const chairpersonCount = members.filter((m) => m.role === SRCMemberRole.CHAIRPERSON).length;
  if (chairpersonCount !== 1) {
    throw new AppError('SRC committee must have exactly one chairperson', 400);
  }

  const chairperson = members.find((m) => m.role === SRCMemberRole.CHAIRPERSON);
  if (chairperson && chairperson.faculty.toString() !== hodFaculty._id.toString()) {
    throw new AppError('The chairperson of an SRC committee must be the HOD.', 400);
  }

  let studentProfile = await StudentProfile.findById(studentId);
  if (!studentProfile) {
    studentProfile = await StudentProfile.findOne({ user: studentId });
  }
  if (!studentProfile) {
    throw new AppError('Student profile not found', 404);
  }

  let supervisorId = studentProfile.supervisor?.toString();
  if (!supervisorId) {
    const active = await Supervisor.findOne({ student: studentProfile._id, isActive: true });
    if (active && active.supervisor) {
      supervisorId = active.supervisor.toString();
      studentProfile.supervisor = active.supervisor;
      await studentProfile.save();
    }
  }

  if (!supervisorId) {
    throw new AppError('A supervisor must be assigned to the student before creating the SRC committee.', 400);
  }

  const supervisorMember = members.find((m) => m.role === SRCMemberRole.SUPERVISOR);
  if (supervisorMember && supervisorMember.faculty !== supervisorId) {
    throw new AppError('SRC supervisor must match the assigned supervisor', 400);
  }

  const nonSupervisorRoles = members.filter(
    (m) => m.faculty === supervisorId && m.role !== SRCMemberRole.SUPERVISOR
  );
  const invalidSupervisorRoles = nonSupervisorRoles.filter(
    (m) => !(m.role === SRCMemberRole.CHAIRPERSON && m.faculty === hodFaculty._id.toString())
  );
  if (invalidSupervisorRoles.length > 0) {
    throw new AppError('The assigned supervisor cannot also be selected as a regular or external member.', 400);
  }

  // Check department constraints for MEMBER vs EXTERNAL_MEMBER
  for (const m of members) {
    if (m.role === SRCMemberRole.MEMBER) {
      const fac = await FacultyProfile.findById(m.faculty);
      if (!fac || fac.department.trim().toUpperCase() !== 'CSE') {
        throw new AppError(`Regular Member must belong to CSE department (${fac ? fac.department : 'unknown'})`, 400);
      }
    } else if (m.role === SRCMemberRole.EXTERNAL_MEMBER) {
      const fac = await FacultyProfile.findById(m.faculty);
      if (!fac || fac.department.trim().toUpperCase() === 'CSE') {
        throw new AppError(`External Member must belong to a department outside CSE (${fac ? fac.department : 'unknown'})`, 400);
      }
    }
  }

  const regularOrExternalMembers = members.filter(
    (m) => m.role === SRCMemberRole.MEMBER || m.role === SRCMemberRole.EXTERNAL_MEMBER
  );
  if (regularOrExternalMembers.length < 2) {
    throw new AppError('SRC committee must have at least 2 members (internal/external, per ordinance)', 400);
  }
};

export const createSRCCommittee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId, members: rawMembers } = req.body;

  if (!studentId || !rawMembers || !Array.isArray(rawMembers) || rawMembers.length === 0) {
    throw new AppError('studentId and committee members are required', 400);
  }

  const hodFaculty = await FacultyProfile.findOne({ isHod: true });
  if (!hodFaculty) {
    throw new AppError('No HOD found in system. Please designate a Faculty as HOD in Faculty Management before creating an SRC committee.', 400);
  }

  let studentProfile = await StudentProfile.findById(studentId);
  if (!studentProfile) {
    studentProfile = await StudentProfile.findOne({ user: studentId });
  }
  if (!studentProfile) {
    throw new AppError('Student profile not found', 404);
  }

  let supervisorId = studentProfile.supervisor?.toString();
  let coSupervisorId = studentProfile.coSupervisor?.toString();
  if (!supervisorId) {
    const active = await Supervisor.findOne({ student: studentProfile._id, isActive: true });
    if (active && active.supervisor) {
      supervisorId = active.supervisor.toString();
      coSupervisorId = active.coSupervisor?.toString();
      studentProfile.supervisor = active.supervisor;
      if (active.coSupervisor) studentProfile.coSupervisor = active.coSupervisor;
      await studentProfile.save();
    }
  }

  if (!supervisorId) {
    throw new AppError('A supervisor must be assigned to the student before creating the SRC committee.', 400);
  }

  // Chairperson is permanently locked to HOD (admin cannot choose chairperson)
  const nonChairMembers = rawMembers.filter((m) => m.role !== SRCMemberRole.CHAIRPERSON);
  const members = [
    { faculty: hodFaculty._id.toString(), role: SRCMemberRole.CHAIRPERSON },
    ...nonChairMembers,
  ];

  if (!members.some((m) => m.role === SRCMemberRole.SUPERVISOR)) {
    members.push({ faculty: supervisorId, role: SRCMemberRole.SUPERVISOR });
  }
  if (coSupervisorId && !members.some((m) => m.role === SRCMemberRole.CO_SUPERVISOR)) {
    members.push({ faculty: coSupervisorId, role: SRCMemberRole.CO_SUPERVISOR });
  }

  const existing = await SRCCommittee.findOne({ student: studentProfile._id });
  if (existing) {
    throw new AppError('SRC committee already exists for this student. Use update instead.', 409);
  }

  await validateSRCMembers(members, studentProfile._id.toString());

  const committee = await SRCCommittee.create({ student: studentProfile._id, members });

  await StudentProfile.findByIdAndUpdate(studentProfile._id, { srcCommittee: committee._id.toString() });

  await createAuditLog({
    user: req.user!.id,
    action: 'CREATE_SRC_COMMITTEE',
    entity: 'SRCCommittee',
    entityId: committee._id.toString(),
    newValue: { studentId: studentProfile._id, members } as Record<string, unknown>,
  });

  const populated = await SRCCommittee.findById(committee._id).populate({
    path: 'members.faculty',
    select: 'employeeId department designation user profilePhoto',
    populate: { path: 'user', select: 'name email' },
  });

  res.status(201).json({ success: true, data: populated || committee });
});

export const updateSRCCommittee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { members: rawMembers } = req.body;

  if (!rawMembers || !Array.isArray(rawMembers)) {
    throw new AppError('members array is required', 400);
  }

  const hodFaculty = await FacultyProfile.findOne({ isHod: true });
  if (!hodFaculty) {
    throw new AppError('No HOD found in system. Please designate a Faculty as HOD in Faculty Management before updating an SRC committee.', 400);
  }

  const committee = await SRCCommittee.findById(id);
  if (!committee) {
    throw new AppError('SRC committee not found', 404);
  }

  let studentProfile = await StudentProfile.findById(committee.student);
  if (!studentProfile) {
    studentProfile = await StudentProfile.findOne({ user: committee.student });
  }

  let supervisorId = studentProfile?.supervisor?.toString();
  let coSupervisorId = studentProfile?.coSupervisor?.toString();
  if (!supervisorId && studentProfile) {
    const active = await Supervisor.findOne({ student: studentProfile._id, isActive: true });
    if (active && active.supervisor) {
      supervisorId = active.supervisor.toString();
      coSupervisorId = active.coSupervisor?.toString();
      studentProfile.supervisor = active.supervisor;
      if (active.coSupervisor) studentProfile.coSupervisor = active.coSupervisor;
      await studentProfile.save();
    }
  }

  // Chairperson is permanently locked to HOD (admin cannot choose chairperson)
  const nonChairMembers = rawMembers.filter((m) => m.role !== SRCMemberRole.CHAIRPERSON);
  const members = [
    { faculty: hodFaculty._id.toString(), role: SRCMemberRole.CHAIRPERSON },
    ...nonChairMembers,
  ];

  if (supervisorId && !members.some((m) => m.role === SRCMemberRole.SUPERVISOR)) {
    members.push({ faculty: supervisorId, role: SRCMemberRole.SUPERVISOR });
  }
  if (coSupervisorId && !members.some((m) => m.role === SRCMemberRole.CO_SUPERVISOR)) {
    members.push({ faculty: coSupervisorId, role: SRCMemberRole.CO_SUPERVISOR });
  }

  await validateSRCMembers(members, committee.student.toString());

  const previousValue = committee.toObject() as unknown as Record<string, unknown>;

  committee.members = members;
  await committee.save();

  await createAuditLog({
    user: req.user!.id,
    action: 'UPDATE_SRC_COMMITTEE',
    entity: 'SRCCommittee',
    entityId: id,
    previousValue,
    newValue: { members } as Record<string, unknown>,
  });

  const populated = await SRCCommittee.findById(committee._id).populate({
    path: 'members.faculty',
    select: 'employeeId department designation user profilePhoto',
    populate: { path: 'user', select: 'name email' },
  });

  res.status(200).json({ success: true, data: populated || committee });
});

// ─── Event Management ────────────────────────────────────────────────────────

export const createEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, eventType, description, date, startTime, endTime, location, participants, deadline } = req.body;

  if (!title || !eventType || !date || !startTime || !endTime) {
    throw new AppError('title, eventType, date, startTime, and endTime are required', 400);
  }

  const eventDate = new Date(date);
  if (isNaN(eventDate.getTime())) {
    throw new AppError('Invalid event date', 400);
  }

  const parsedStartTime = parseEventDateTime(eventDate, startTime);
  const parsedEndTime = parseEventDateTime(eventDate, endTime);

  const { userIds, participantDocs } = await resolveParticipants(Array.isArray(participants) ? participants : []);

  const event = await Event.create({
    title,
    eventType,
    description: description || '',
    date: eventDate,
    startTime: parsedStartTime,
    endTime: parsedEndTime,
    location: location || '',
    organizer: req.user!.id,
    organizerModel: 'User',
    participants: participantDocs,
    deadline,
  });

  if (userIds.length) {
    const eventMessage = `You have been invited to "${title}" on ${eventDate.toLocaleDateString()}.`;
    await createBulkNotifications(userIds, { title: 'New Event: ' + title, message: eventMessage, type: 'event_invitation', link: '/student/events' });

    const participantUsers = await User.find({ _id: { $in: userIds } }).select('email').lean();
    await Promise.allSettled(participantUsers.map((u: any) => sendNotificationEmail(u.email, 'New Event: ' + title, eventMessage)));
  }

  await createAuditLog({
    user: req.user!.id,
    action: 'CREATE_EVENT',
    entity: 'Event',
    entityId: event._id.toString(),
    newValue: { title, eventType, date: eventDate } as Record<string, unknown>,
  });

  res.status(201).json({ success: true, data: event });
});

export const updateEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const event = await Event.findById(id);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  const previousValue = event.toObject() as unknown as Record<string, unknown>;

  const baseDate = req.body.date ? new Date(req.body.date) : event.date;

  const allowedFields = ['title', 'eventType', 'description', 'date', 'startTime', 'endTime', 'location', 'participants', 'deadline', 'eligibilityRules'];
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      if (field === 'startTime' || field === 'endTime') {
        (event as unknown as Record<string, unknown>)[field] = parseEventDateTime(baseDate, req.body[field]);
      } else if (field === 'date') {
        (event as unknown as Record<string, unknown>)[field] = new Date(req.body[field]);
      } else {
        (event as unknown as Record<string, unknown>)[field] = req.body[field];
      }
    }
  }
  await event.save();

  await createAuditLog({
    user: req.user!.id,
    action: 'UPDATE_EVENT',
    entity: 'Event',
    entityId: id,
    previousValue,
    newValue: req.body as Record<string, unknown>,
  });

  res.status(200).json({ success: true, data: event });
});

export const deleteEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const event = await Event.findById(id);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  await Event.findByIdAndDelete(id);

  await createAuditLog({
    user: req.user!.id,
    action: 'DELETE_EVENT',
    entity: 'Event',
    entityId: id,
    previousValue: { title: event.title, eventType: event.eventType } as Record<string, unknown>,
  });

  res.status(200).json({
    success: true,
    data: { message: 'Event deleted successfully' },
  });
});

export const listEvents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

  const result = await paginate(Event, {}, page, limit, { date: -1 }, ['organizer']);

  res.status(200).json({
    success: true,
    data: {
      events: result.data,
      pagination: {
        page: result.page,
        limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    },
  });
});

// ─── Form Management ─────────────────────────────────────────────────────────

export const listForms = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

  const result = await paginate(Form, {}, page, limit, { createdAt: -1 });

  res.status(200).json({
    success: true,
    data: {
      forms: result.data,
      pagination: {
        page: result.page,
        limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    },
  });
});

export const createForm = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { formName, formType, fileUrl, semesterApplicable, studentTypeApplicable, department } = req.body;

  if (!formName || !formType || !fileUrl) {
    throw new AppError('formName, formType, and fileUrl are required', 400);
  }

  const form = await Form.create({
    formName,
    formType,
    fileUrl,
    semesterApplicable,
    studentTypeApplicable,
    department,
  });

  await createAuditLog({
    user: req.user!.id,
    action: 'CREATE_FORM',
    entity: 'Form',
    entityId: form._id.toString(),
    newValue: { formName, formType, fileUrl } as Record<string, unknown>,
  });

  res.status(201).json({ success: true, data: form });
});

export const updateForm = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const form = await Form.findById(id);
  if (!form) {
    throw new AppError('Form not found', 404);
  }

  const previousValue = form.toObject() as unknown as Record<string, unknown>;

  const allowedFields = ['formName', 'formType', 'fileUrl', 'semesterApplicable', 'studentTypeApplicable', 'department'];
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      (form as unknown as Record<string, unknown>)[field] = req.body[field];
    }
  }
  await form.save();

  await createAuditLog({
    user: req.user!.id,
    action: 'UPDATE_FORM',
    entity: 'Form',
    entityId: id,
    previousValue,
    newValue: req.body as Record<string, unknown>,
  });

  res.status(200).json({ success: true, data: form });
});

export const deleteForm = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const form = await Form.findByIdAndDelete(id);
  if (!form) {
    throw new AppError('Form not found', 404);
  }

  await createAuditLog({
    user: req.user!.id,
    action: 'DELETE_FORM',
    entity: 'Form',
    entityId: id,
    previousValue: { formName: form.formName } as Record<string, unknown>,
  });

  res.status(200).json({
    success: true,
    data: { message: 'Form deleted successfully' },
  });
});

// ─── Deadline Management ─────────────────────────────────────────────────────

export const listDeadlines = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

  const result = await paginate(Deadline, {}, page, limit, { dueDate: -1 }, ['semester', 'student']);

  res.status(200).json({
    success: true,
    data: {
      deadlines: result.data,
      pagination: {
        page: result.page,
        limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    },
  });
});

export const createDeadline = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, description, dueDate, semester, student } = req.body;

  if (!title || !dueDate) {
    throw new AppError('title and dueDate are required', 400);
  }

  let semesterNum: number | undefined;
  if (semester !== undefined && semester !== null) {
    const n = Number(semester);
    if (!Number.isInteger(n) || n < 1) {
      throw new AppError('semester must be a positive integer', 400);
    }
    semesterNum = n;
  }

  const deadline = await Deadline.create({
    title,
    description: description || '',
    dueDate,
    semester: semesterNum,
    student,
    createdBy: req.user!.id,
  });

  await createAuditLog({
    user: req.user!.id,
    action: 'CREATE_DEADLINE',
    entity: 'Deadline',
    entityId: deadline._id.toString(),
    newValue: { title, dueDate } as Record<string, unknown>,
  });

  res.status(201).json({ success: true, data: deadline });
});

// ─── Milestone Management ─────────────────────────────────────────────────────

export const getStudentMilestones = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  let studentProfile = await StudentProfile.findById(id);
  if (!studentProfile) {
    studentProfile = await StudentProfile.findOne({ user: id });
  }
  if (!studentProfile) {
    throw new AppError('Student profile not found', 404);
  }

  await seedMilestones(studentProfile._id.toString());
  const milestones = await getMilestones(studentProfile._id.toString());

  res.status(200).json({ success: true, data: milestones });
});

export const updateMilestone = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, dueDate, title, description } = req.body;

  const milestone = await Milestone.findById(id);
  if (!milestone) {
    throw new AppError('Milestone not found', 404);
  }

  const studentProfile = await StudentProfile.findById(milestone.student);
  if (!studentProfile) {
    throw new AppError('Student profile not found', 404);
  }

  const updated = await updateMilestoneService(id, req.user!.id, { status, dueDate, title, description });

  await createAuditLog({
    user: req.user!.id,
    action: 'UPDATE_MILESTONE',
    entity: 'Milestone',
    entityId: id,
    previousValue: milestone.toObject() as unknown as Record<string, unknown>,
    newValue: { status, dueDate, title, description } as Record<string, unknown>,
  });

  const studentUser = studentProfile.user ? studentProfile.user.toString() : '';
  if (studentUser) {
    const statusLabel =
      status === 'completed' ? 'Approved' : status === 'rejected' ? 'Rejected' : status || 'Updated';
    await createNotification({
      user: studentUser,
      title: `Milestone ${statusLabel}: ${milestone.title}`,
      message: `Your milestone "${milestone.title}" has been updated to ${statusLabel.toLowerCase()} by the administrator.`,
      type: 'milestone',
      link: '/student/milestones',
    });
  }

  res.status(200).json({ success: true, data: updated });
});

// ─── Global Search ───────────────────────────────────────────────────────────

export const globalSearch = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { q } = req.query;

  if (!q) {
    throw new AppError('Search query (q) is required', 400);
  }

  const safeQ = (q as string).slice(0, 100);
  const regex = new RegExp(escapeRegex(safeQ), 'i');

  const [students, faculty, studentUsers, facultyUsers] = await Promise.all([
    StudentProfile.find({
      $or: [{ collegeId: regex }, { rollNumber: regex }],
    })
      .populate('user', 'name email isActive')
      .limit(20)
      .lean(),
    FacultyProfile.find({
      employeeId: regex,
    })
      .populate('user', 'name email isActive')
      .limit(20)
      .lean(),
    User.find({
      role: UserRole.STUDENT,
      name: regex,
    }).select('_id name email isActive').limit(20).lean(),
    User.find({
      role: UserRole.SUPERVISOR,
      name: regex,
    }).select('_id name email isActive').limit(20).lean(),
  ]);

  const userIdOf = (value: unknown): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && '_id' in (value as Record<string, unknown>)) {
      return String((value as { _id: unknown })._id);
    }
    return '';
  };

  const studentIds = new Set(students.map((s) => userIdOf(s.user)));
  const matchedStudentsFromUser = studentUsers.filter((u) => !studentIds.has(String(u._id)));
  const matchedFacultyFromUser = facultyUsers.filter((u) => !faculty.some((f) => userIdOf(f.user) === String(u._id)));

  res.status(200).json({
    success: true,
    data: {
      students: [...students, ...matchedStudentsFromUser.map((u) => ({ user: u }))],
      faculty: [...faculty, ...matchedFacultyFromUser.map((u) => ({ user: u }))],
    },
  });
});

export const getDepartmentDues = asyncHandler(async (req: AuthRequest, res: Response) => {
  const duesData = await getAdminDepartmentDues();
  res.status(200).json({ success: true, data: duesData });
});

export const listExternalExaminers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { thesisId, studentId } = req.query;
  const filter: Record<string, any> = {};
  if (thesisId) filter.thesis = thesisId;
  if (studentId) filter.student = studentId;

  const examiners = await ExternalExaminer.find(filter)
    .populate('student', 'rollNumber collegeId department user')
    .populate({
      path: 'student',
      populate: { path: 'user', select: 'name email' },
    })
    .sort({ invitationDate: -1 })
    .lean();

  // Auto-flag any invited examiner overdue past 4 weeks (28 days)
  const now = Date.now();
  const enhanced = examiners.map((ex: any) => {
    const isOverdue =
      ex.status === ExternalExaminerStatus.INVITED &&
      new Date(ex.responseDueDate).getTime() < now;
    return {
      ...ex,
      isOverdue,
      recommendedAction: isOverdue ? 'Replace examiner (4 weeks elapsed without response)' : 'Awaiting response',
    };
  });

  res.status(200).json({ success: true, data: enhanced });
});

export const addExternalExaminer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { thesisId, studentId, examinerName, examinerEmail, institution, invitationDate } = req.body;

  if (!thesisId || !studentId || !examinerName || !examinerEmail || !institution) {
    throw new AppError('thesisId, studentId, examinerName, examinerEmail, and institution are required', 400);
  }

  const invDate = invitationDate ? new Date(invitationDate) : new Date();
  // Ordinance Rule: "Examiner response: If examiner does not respond, another examiner may be appointed after 4 weeks"
  const responseDueDate = new Date(invDate.getTime() + 28 * 86400000);

  const examiner = await ExternalExaminer.create({
    thesis: thesisId,
    student: studentId,
    examinerName: examinerName.trim(),
    examinerEmail: examinerEmail.toLowerCase().trim(),
    institution: institution.trim(),
    invitationDate: invDate,
    responseDueDate,
    status: ExternalExaminerStatus.INVITED,
  });

  await createAuditLog({
    user: req.user!.id,
    action: 'ADD_EXTERNAL_EXAMINER',
    entity: 'ExternalExaminer',
    entityId: examiner._id.toString(),
    newValue: { examinerName, examinerEmail, institution, responseDueDate },
  });

  res.status(201).json({ success: true, data: examiner });
});

export const updateExternalExaminer = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, category, reportUrl, remarks } = req.body;

  const examiner = await ExternalExaminer.findById(id);
  if (!examiner) {
    throw new AppError('External examiner record not found', 404);
  }

  if (status) examiner.status = status;
  if (category) {
    examiner.category = category;
    // Ordinance Rule: "Category III re-evaluation: Examiner is requested to respond within 4 weeks"
    if (category === ExaminerCategory.CATEGORY_III) {
      examiner.cat3ResponseDueDate = new Date(Date.now() + 28 * 86400000);
    }
  }
  if (reportUrl !== undefined) examiner.reportUrl = reportUrl;
  if (remarks !== undefined) examiner.remarks = remarks;

  await examiner.save();

  await createAuditLog({
    user: req.user!.id,
    action: 'UPDATE_EXTERNAL_EXAMINER',
    entity: 'ExternalExaminer',
    entityId: examiner._id.toString(),
    newValue: { status, category, remarks },
  });

  res.status(200).json({ success: true, data: examiner });
});

export const listAllInternships = asyncHandler(async (req: AuthRequest, res: Response) => {
  const internships = await Internship.find({})
    .populate('student', 'rollNumber collegeId department user')
    .populate({
      path: 'student',
      populate: { path: 'user', select: 'name email' },
    })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, data: internships });
});

export const adminReviewInternship = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, adminComment } = req.body;

  if (!status || ![InternshipStatus.ADMIN_APPROVED, InternshipStatus.REJECTED].includes(status)) {
    throw new AppError('Status must be admin_approved or rejected', 400);
  }

  const internship = await Internship.findById(id);
  if (!internship) {
    throw new AppError('Internship record not found', 404);
  }

  internship.status = status;
  if (adminComment) {
    internship.adminComment = adminComment.trim();
  }
  await internship.save();

  await createAuditLog({
    user: req.user!.id,
    action: 'ADMIN_REVIEW_INTERNSHIP',
    entity: 'Internship',
    entityId: internship._id.toString(),
    newValue: { status, adminComment },
  });

  res.status(200).json({ success: true, data: internship });
});

// ─── Student Course Management (Admin Direct, No Approval Needed) ─────────────

export const getStudentCourses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  let studentProfile = await StudentProfile.findById(studentId);
  if (!studentProfile) {
    studentProfile = await StudentProfile.findOne({ user: studentId });
  }
  if (!studentProfile) {
    throw new AppError('Student profile not found', 404);
  }

  const semesters = await Semester.find({ student: studentProfile._id }).sort({ semesterNumber: 1 }).lean();

  const studentCourses = await StudentCourse.find({ student: studentProfile._id })
    .populate('course')
    .populate('semester', 'semesterNumber academicYear')
    .sort({ createdAt: -1 })
    .lean();

  const credits = await Credits.find({ student: studentProfile._id })
    .populate('semester', 'semesterNumber academicYear')
    .lean();

  res.status(200).json({
    success: true,
    data: {
      semesters,
      studentCourses,
      credits,
    },
  });
});

export const addStudentCourse = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const { semesterId, semesterNumber, academicYear, courseCode, courseName, credits, status, grade } = req.body;

  if (!courseCode || !courseName || credits === undefined) {
    throw new AppError('courseCode, courseName and credits are required', 400);
  }

  let studentProfile = await StudentProfile.findById(studentId);
  if (!studentProfile) {
    studentProfile = await StudentProfile.findOne({ user: studentId });
  }
  if (!studentProfile) {
    throw new AppError('Student profile not found', 404);
  }

  let semesterDoc: any = null;
  if (semesterId) {
    semesterDoc = await Semester.findOne({ _id: semesterId, student: studentProfile._id });
  }
  if (!semesterDoc && semesterNumber) {
    semesterDoc = await Semester.findOne({ semesterNumber, student: studentProfile._id });
    if (!semesterDoc) {
      semesterDoc = await Semester.create({
        student: studentProfile._id,
        semesterNumber,
        academicYear: academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        startDate: new Date(),
        endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      });
    }
  }

  if (!semesterDoc) {
    const latestSem = await Semester.findOne({ student: studentProfile._id }).sort({ semesterNumber: -1 });
    if (latestSem) {
      semesterDoc = latestSem;
    } else {
      semesterDoc = await Semester.create({
        student: studentProfile._id,
        semesterNumber: 1,
        academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        startDate: new Date(),
        endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      });
    }
  }

  const courseStatus = status === 'pending'
    ? ApprovalStatus.PENDING
    : (status === 'approved' ? ApprovalStatus.APPROVED : ApprovalStatus.COMPLETED);

  const course = await Course.create({
    semester: semesterDoc._id,
    courseCode,
    courseName,
    credits: Number(credits),
    grade: grade || undefined,
    status: courseStatus,
  });

  const studentCourse = await StudentCourse.create({
    student: studentProfile._id,
    course: course._id,
    semester: semesterDoc._id,
    status: courseStatus,
    approvedBy: req.user!.id,
    approvedAt: new Date(),
  });

  try {
    const semResult = await computeCreditsForSemester(
      studentProfile._id.toString(),
      semesterDoc._id.toString(),
      studentProfile.requiredCredits || 12
    );
    await Credits.findOneAndUpdate(
      { student: studentProfile._id, semester: semesterDoc._id },
      { earnedCredits: semResult.earned, requiredCredits: semResult.required },
      { upsert: true, new: true }
    );
  } catch (err) {
    // Non-blocking credit calculation
  }

  await createAuditLog({
    user: req.user!.id,
    action: 'ADMIN_ADD_COURSE',
    entity: 'StudentCourse',
    entityId: studentCourse._id.toString(),
    newValue: { courseCode, courseName, credits, status: courseStatus, grade },
  });

  res.status(201).json({
    success: true,
    data: {
      studentCourse,
      course,
    },
  });
});

export const updateStudentCourse = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId, studentCourseId } = req.params;
  const { courseCode, courseName, credits, status, grade, semesterId } = req.body;

  const studentCourse = await StudentCourse.findById(studentCourseId);
  if (!studentCourse) {
    throw new AppError('Student course record not found', 404);
  }

  let studentProfile = await StudentProfile.findById(studentId);
  if (!studentProfile) {
    studentProfile = await StudentProfile.findOne({ user: studentId });
  }

  const course = await Course.findById(studentCourse.course);
  if (!course) {
    throw new AppError('Course record not found', 404);
  }

  const prevSemester = studentCourse.semester;

  if (courseCode) course.courseCode = courseCode;
  if (courseName) course.courseName = courseName;
  if (credits !== undefined) course.credits = Number(credits);
  if (grade !== undefined) course.grade = grade;
  if (status) {
    const courseStatus = status === 'pending'
      ? ApprovalStatus.PENDING
      : (status === 'approved' ? ApprovalStatus.APPROVED : ApprovalStatus.COMPLETED);
    course.status = courseStatus;
    studentCourse.status = courseStatus;
    studentCourse.approvedBy = req.user!.id;
    studentCourse.approvedAt = new Date();
  }
  if (semesterId) {
    course.semester = semesterId;
    studentCourse.semester = semesterId;
  }

  await course.save();
  await studentCourse.save();

  if (studentProfile) {
    try {
      const semResult = await computeCreditsForSemester(
        studentProfile._id.toString(),
        studentCourse.semester.toString(),
        studentProfile.requiredCredits || 12
      );
      await Credits.findOneAndUpdate(
        { student: studentProfile._id, semester: studentCourse.semester },
        { earnedCredits: semResult.earned, requiredCredits: semResult.required },
        { upsert: true, new: true }
      );

      if (prevSemester && prevSemester.toString() !== studentCourse.semester.toString()) {
        const prevResult = await computeCreditsForSemester(
          studentProfile._id.toString(),
          prevSemester.toString(),
          studentProfile.requiredCredits || 12
        );
        await Credits.findOneAndUpdate(
          { student: studentProfile._id, semester: prevSemester },
          { earnedCredits: prevResult.earned, requiredCredits: prevResult.required },
          { upsert: true, new: true }
        );
      }
    } catch (err) {
      // Non-blocking credit calculation
    }
  }

  await createAuditLog({
    user: req.user!.id,
    action: 'ADMIN_UPDATE_COURSE',
    entity: 'StudentCourse',
    entityId: studentCourseId,
    newValue: { courseCode, courseName, credits, status: studentCourse.status, grade },
  });

  res.status(200).json({
    success: true,
    data: {
      studentCourse,
      course,
    },
  });
});

export const deleteStudentCourse = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId, studentCourseId } = req.params;

  const studentCourse = await StudentCourse.findById(studentCourseId);
  if (!studentCourse) {
    throw new AppError('Student course record not found', 404);
  }

  let studentProfile = await StudentProfile.findById(studentId);
  if (!studentProfile) {
    studentProfile = await StudentProfile.findOne({ user: studentId });
  }

  const courseId = studentCourse.course;
  const semesterId = studentCourse.semester;

  await StudentCourse.findByIdAndDelete(studentCourseId);
  if (courseId) {
    await Course.findByIdAndDelete(courseId);
  }

  if (studentProfile && semesterId) {
    try {
      const semResult = await computeCreditsForSemester(
        studentProfile._id.toString(),
        semesterId.toString(),
        studentProfile.requiredCredits || 12
      );
      await Credits.findOneAndUpdate(
        { student: studentProfile._id, semester: semesterId },
        { earnedCredits: semResult.earned, requiredCredits: semResult.required },
        { upsert: true, new: true }
      );
    } catch (err) {
      // Non-blocking credit calculation
    }
  }

  await createAuditLog({
    user: req.user!.id,
    action: 'ADMIN_DELETE_COURSE',
    entity: 'StudentCourse',
    entityId: studentCourseId,
  });

  res.status(200).json({
    success: true,
    data: { message: 'Course deleted successfully' },
  });
});


