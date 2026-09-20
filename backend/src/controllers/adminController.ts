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
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { createAuditLog } from '../utils/audit';
import { createNotification, createBulkNotifications } from '../utils/notify';
import { UserRole, AuthRequest, ApprovalStatus, SRCMemberRole } from '../types';
import { paginate } from '../utils/pagination';
import { Milestone } from '../models/Milestone';
import { seedMilestones, getMilestones, updateMilestone as updateMilestoneService } from '../services/milestoneService';
import { resolveParticipants, parseEventDateTime } from '../utils/participants';
import { sendNotificationEmail } from '../utils/email';
import { escapeRegex } from '../utils/query';

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const getDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const [totalStudents, totalFaculty, totalEvents, pendingApprovals] = await Promise.all([
    User.countDocuments({ role: UserRole.STUDENT }),
    User.countDocuments({ role: UserRole.SUPERVISOR }),
    Event.countDocuments(),
    ApprovalRequest.countDocuments({ status: ApprovalStatus.PENDING }),
  ]);

  res.status(200).json({
    success: true,
    data: { totalStudents, totalFaculty, totalEvents, pendingApprovals },
  });
});

// ─── Student Management ──────────────────────────────────────────────────────

export const createStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, password, name, collegeId, rollNumber, studentType, department, researchArea, admissionDate, requiredCredits } = req.body;

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
    department,
    researchArea: researchArea || '',
    admissionDate: admissionDate || new Date(),
    requiredCredits: requiredCredits || undefined,
  });

  await seedMilestones(profile._id.toString());

  await createAuditLog({
    user: req.user!.id,
    action: 'CREATE_STUDENT',
    entity: 'StudentProfile',
    entityId: profile._id.toString(),
    newValue: { email, name, collegeId, rollNumber, studentType, department } as Record<string, unknown>,
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

  const allowedFields = ['collegeId', 'rollNumber', 'studentType', 'department', 'researchArea', 'profilePhoto'];
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
  const { email, password, name, employeeId, department, designation, researchAreas } = req.body;

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
    researchAreas: researchAreas || [],
  });

  await createAuditLog({
    user: req.user!.id,
    action: 'CREATE_FACULTY',
    entity: 'FacultyProfile',
    entityId: profile._id.toString(),
    newValue: { email, name, employeeId, department, designation } as Record<string, unknown>,
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

  const allowedFields = ['employeeId', 'department', 'designation', 'researchAreas', 'profilePhoto'];
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
  const chairpersonCount = members.filter((m) => m.role === SRCMemberRole.CHAIRPERSON).length;
  if (chairpersonCount !== 1) {
    throw new AppError('SRC committee must have exactly one chairperson', 400);
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
  if (nonSupervisorRoles.length > 0) {
    throw new AppError('The assigned supervisor cannot also be selected as Chairperson or Member.', 400);
  }

  const regularMembers = members.filter((m) => m.role === SRCMemberRole.MEMBER);
  if (regularMembers.length < 2) {
    throw new AppError('SRC committee must have at least 2 regular members (per ordinance)', 400);
  }
};

export const createSRCCommittee = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { studentId, members: rawMembers } = req.body;

  if (!studentId || !rawMembers || !Array.isArray(rawMembers) || rawMembers.length === 0) {
    throw new AppError('studentId and committee members are required', 400);
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

  const members = [...rawMembers];
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

  const members = [...rawMembers];
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

