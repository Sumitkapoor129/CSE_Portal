import { Response } from 'express';
import { StudentProfile } from '../models/StudentProfile';
import { Semester } from '../models/Semester';
import { Course } from '../models/Course';
import { StudentCourse } from '../models/StudentCourse';
import { Credits } from '../models/Credits';
import { DocumentModel } from '../models/Document';
import { Thesis } from '../models/Thesis';
import { Notification } from '../models/Notification';
import { Deadline } from '../models/Deadline';
import { Event } from '../models/Event';
import { Form } from '../models/Form';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { createAuditLog } from '../utils/audit';
import { UserRole, AuthRequest, ApprovalStatus, ThesisStatus } from '../types';
import { computeTotalCredits } from '../services/creditService';
import { getMilestones } from '../services/milestoneService';

const requireAssignedSupervisor = (profile: { supervisor?: string }, action: string): void => {
  if (!profile.supervisor) {
    throw new AppError(`${action} requires an assigned supervisor.`, 403);
  }
};

const deriveSemesterDates = (academicYear?: string): { startDate: Date; endDate: Date } => {
  const match = /^(\d{4})[-–](\d{2})$/.exec((academicYear || '').trim());
  if (match) {
    const startYear = Number(match[1]);
    const endShort = Number(match[2]);
    const endYear = endShort > 50 ? 1900 + endShort : 2000 + endShort;
    return {
      startDate: new Date(Date.UTC(startYear, 7, 1)),
      endDate: new Date(Date.UTC(endYear, 6, 31)),
    };
  }
  const now = new Date();
  return {
    startDate: new Date(now.getFullYear(), now.getMonth(), 1),
    endDate: new Date(now.getFullYear() + 1, now.getMonth(), 1),
  };
};

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const profile = await StudentProfile.findOne({ user: req.user!.id })
    .populate('user', 'name email role')
    .populate('supervisor', 'employeeId department designation')
    .populate('srcCommittee')
    .lean();

  if (!profile) {
    throw new AppError('Student profile not found', 404);
  }

  res.status(200).json({ success: true, data: profile });
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name } = req.body;

  const profile = await StudentProfile.findOne({ user: req.user!.id });
  if (!profile) {
    throw new AppError('Student profile not found', 404);
  }

  const previousValue = {
    researchArea: profile.researchArea,
    profilePhoto: profile.profilePhoto,
  };

  const editable = ['researchArea', 'profilePhoto', 'dateOfBirth', 'gender', 'bloodGroup', 'category', 'phone', 'address', 'lastDegree', 'institution', 'graduationYear', 'qualification'] as const;
  for (const field of editable) {
    if (req.body[field] !== undefined) {
      (profile as unknown as Record<string, unknown>)[field] = req.body[field];
    }
  }
  if (req.body.dateOfBirth) profile.dateOfBirth = new Date(req.body.dateOfBirth);

  const REQUIRED_PROFILE_FIELDS = ['researchArea', 'phone', 'address', 'lastDegree', 'institution', 'graduationYear', 'dateOfBirth'] as const;
  profile.isProfileComplete = REQUIRED_PROFILE_FIELDS.every((f) => {
    const v = (profile as unknown as Record<string, unknown>)[f];
    return v !== undefined && v !== null && v !== '';
  });

  await profile.save();

  if (name !== undefined) {
    const { User } = await import('../models/User');
    await User.findByIdAndUpdate(req.user!.id, { name });
  }

  await createAuditLog({
    user: req.user!.id,
    action: 'update_profile',
    entity: 'StudentProfile',
    entityId: profile._id.toString(),
    previousValue,
    newValue: {
      researchArea: profile.researchArea,
      profilePhoto: profile.profilePhoto,
    },
  });

  res.status(200).json({ success: true, data: profile });
});

export const getSemesters = asyncHandler(async (req: AuthRequest, res: Response) => {
  const profile = await StudentProfile.findOne({ user: req.user!.id });
  if (!profile) {
    throw new AppError('Student profile not found', 404);
  }

  const semesters = await Semester.find({ student: profile._id }).sort({ semesterNumber: 1 }).lean();

  res.status(200).json({ success: true, data: semesters });
});

export const createSemester = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { semesterNumber, academicYear, startDate, endDate } = req.body;

  if (!semesterNumber || !academicYear) {
    throw new AppError('semesterNumber and academicYear are required', 400);
  }

  const profile = await StudentProfile.findOne({ user: req.user!.id });
  if (!profile) {
    throw new AppError('Student profile not found', 404);
  }

  const existing = await Semester.findOne({
    student: profile._id,
    semesterNumber,
  });
  if (existing) {
    throw new AppError('Semester already exists', 409);
  }

  const lastSemester = await Semester.findOne({ student: profile._id }).sort({ semesterNumber: -1 });
  const expected = lastSemester ? lastSemester.semesterNumber + 1 : 1;
  if (semesterNumber !== expected) {
    throw new AppError(`Semester ${semesterNumber} cannot be added. Next semester is ${expected}.`, 400, {
      semesterNumber: `The next semester to add is ${expected}.`,
    });
  }

  const semesterDates = deriveSemesterDates(academicYear);
  const semester = await Semester.create({
    student: profile._id,
    semesterNumber,
    academicYear,
    startDate: startDate ? new Date(startDate) : semesterDates.startDate,
    endDate: endDate ? new Date(endDate) : semesterDates.endDate,
  });

  await createAuditLog({
    user: req.user!.id,
    action: 'create_semester',
    entity: 'Semester',
    entityId: semester._id.toString(),
    newValue: { semesterNumber, academicYear },
  });

  res.status(201).json({ success: true, data: semester });
});

export const getCourses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { semesterId } = req.params;

  const profile = await StudentProfile.findOne({ user: req.user!.id });
  if (!profile) {
    throw new AppError('Student profile not found', 404);
  }

  const semester = await Semester.findOne({ _id: semesterId, student: profile._id });
  if (!semester) {
    throw new AppError('Semester not found', 404);
  }

  const courses = await Course.find({ semester: semester._id }).lean();

  res.status(200).json({ success: true, data: courses });
});

export const addCourse = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { semesterId } = req.params;
  const { courseCode, courseName, credits } = req.body;

  if (!courseCode || !courseName || credits === undefined) {
    throw new AppError('courseCode, courseName and credits are required', 400);
  }

  const profile = await StudentProfile.findOne({ user: req.user!.id });
  if (!profile) {
    throw new AppError('Student profile not found', 404);
  }

  const semester = await Semester.findOne({ _id: semesterId, student: profile._id });
  if (!semester) {
    throw new AppError('Semester not found', 404);
  }

  requireAssignedSupervisor(profile, 'Requesting a course');

  const course = await Course.create({
    semester: semester._id,
    courseCode,
    courseName,
    credits,
    status: ApprovalStatus.PENDING,
  });

  await StudentCourse.create({
    student: profile._id,
    course: course._id,
    semester: semester._id,
    status: ApprovalStatus.PENDING,
  });

  await createAuditLog({
    user: req.user!.id,
    action: 'add_course',
    entity: 'Course',
    entityId: course._id.toString(),
    newValue: { courseCode, courseName, credits },
  });

  res.status(201).json({ success: true, data: course });
});

export const getCredits = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { semesterId } = req.query;

  const profile = await StudentProfile.findOne({ user: req.user!.id });
  if (!profile) {
    throw new AppError('Student profile not found', 404);
  }

  if (semesterId) {
    const credit = await Credits.findOne({
      student: profile._id,
      semester: semesterId,
    });
    if (!credit) {
      throw new AppError('Credits not found for this semester', 404);
    }
    res.status(200).json({ success: true, data: credit });
    return;
  }

  const credits = await Credits.find({ student: profile._id }).lean();
  const total = credits.reduce((sum, c) => sum + c.earnedCredits, 0);

  res.status(200).json({
    success: true,
    data: {
      semesters: credits,
      totalEarnedCredits: total,
    },
  });
});

export const getDocuments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const profile = await StudentProfile.findOne({ user: req.user!.id });
  if (!profile) {
    throw new AppError('Student profile not found', 404);
  }

  const documents = await DocumentModel.find({ student: profile._id })
    .populate('semester', 'semesterNumber academicYear')
    .sort({ uploadDate: -1 })
    .lean();

  res.status(200).json({ success: true, data: documents });
});

export const uploadDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { documentName, documentType, fileUrl, semester } = req.body;

  if (!documentName || !documentType || !fileUrl) {
    throw new AppError('documentName, documentType and fileUrl are required', 400);
  }

  const profile = await StudentProfile.findOne({ user: req.user!.id });
  if (!profile) {
    throw new AppError('Student profile not found', 404);
  }

  requireAssignedSupervisor(profile, 'Uploading a document');

  const document = await DocumentModel.create({
    student: profile._id,
    semester,
    documentName,
    documentType,
    fileUrl,
    uploadedBy: req.user!.id,
    uploadDate: new Date(),
    approvalStatus: ApprovalStatus.PENDING,
  });

  await createAuditLog({
    user: req.user!.id,
    action: 'upload_document',
    entity: 'Document',
    entityId: document._id.toString(),
    newValue: { documentName, documentType },
  });

  res.status(201).json({ success: true, data: document });
});

export const getThesis = asyncHandler(async (req: AuthRequest, res: Response) => {
  const profile = await StudentProfile.findOne({ user: req.user!.id });
  if (!profile) {
    throw new AppError('Student profile not found', 404);
  }

  const thesis = await Thesis.find({ student: profile._id }).sort({ version: -1 }).lean();

  res.status(200).json({ success: true, data: thesis });
});

export const submitThesis = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, documentUrl } = req.body;

  if (!title || !documentUrl) {
    throw new AppError('title and documentUrl are required', 400);
  }

  const profile = await StudentProfile.findOne({ user: req.user!.id });
  if (!profile) {
    throw new AppError('Student profile not found', 404);
  }

  requireAssignedSupervisor(profile, 'Submitting a thesis');

  const lastThesis = await Thesis.findOne({ student: profile._id }).sort({ version: -1 });
  const version = lastThesis ? lastThesis.version + 1 : 1;

  const thesis = await Thesis.create({
    student: profile._id,
    title,
    documentUrl,
    submissionDate: new Date(),
    version,
    status: ThesisStatus.SUBMITTED,
  });

  await createAuditLog({
    user: req.user!.id,
    action: 'submit_thesis',
    entity: 'Thesis',
    entityId: thesis._id.toString(),
    newValue: { title, version },
  });

  res.status(201).json({ success: true, data: thesis });
});

export const getTimeline = asyncHandler(async (req: AuthRequest, res: Response) => {
  const profile = await StudentProfile.findOne({ user: req.user!.id });
  if (!profile) {
    throw new AppError('Student profile not found', 404);
  }

  const semesters = await Semester.find({ student: profile._id }).sort({ semesterNumber: 1 }).lean();

  const timeline: Array<Record<string, unknown>> = semesters.map((sem) => ({
    type: 'semester',
    semesterNumber: sem.semesterNumber,
    academicYear: sem.academicYear,
    startDate: sem.startDate,
    endDate: sem.endDate,
  }));

  const evaluationEvents = await StudentCourse.aggregate([
    { $match: { student: profile._id } },
    {
      $lookup: {
        from: 'courses',
        localField: 'course',
        foreignField: '_id',
        as: 'courseInfo',
      },
    },
    { $unwind: '$courseInfo' },
    {
      $lookup: {
        from: 'semesters',
        localField: 'semester',
        foreignField: '_id',
        as: 'semesterInfo',
      },
    },
    { $unwind: '$semesterInfo' },
    {
      $project: {
        type: { $literal: 'course' },
        courseCode: '$courseInfo.courseCode',
        courseName: '$courseInfo.courseName',
        credits: '$courseInfo.credits',
        status: '$status',
        semesterNumber: '$semesterInfo.semesterNumber',
      },
    },
  ]);

  timeline.push(...evaluationEvents);

  timeline.sort((a, b) => {
    const aNum = (a.semesterNumber as number) ?? 0;
    const bNum = (b.semesterNumber as number) ?? 0;
    return aNum - bNum;
  });

  res.status(200).json({ success: true, data: timeline });
});

export const getNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const notifications = await Notification.find({ user: req.user!.id }).sort({ createdAt: -1 }).lean();

  res.status(200).json({ success: true, data: notifications });
});

export const markNotificationRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const notification = await Notification.findOne({ _id: id, user: req.user!.id });
  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  notification.isRead = true;
  await notification.save();

  res.status(200).json({ success: true, data: notification });
});

export const getDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const profile = await StudentProfile.findOne({ user: req.user!.id })
    .populate('user', 'name email role')
    .populate('supervisor', 'employeeId department designation')
    .populate('srcCommittee')
    .lean();

  if (!profile) {
    throw new AppError('Student profile not found', 404);
  }

  const semesterDocs = await Semester.find({ student: profile._id }).select('semesterNumber').lean();
  const semesterNumbers = semesterDocs.map((s) => s.semesterNumber);
  const now = new Date();

  const [currentSemester, credits, milestones, upcomingDeadlines, upcomingEvents, pendingCourseRequests, thesis, unreadNotifications] = await Promise.all([
    Semester.findOne({ student: profile._id }).sort({ semesterNumber: -1 }).lean(),
    computeTotalCredits(profile._id.toString(), profile.requiredCredits ?? 12),
    getMilestones(profile._id.toString()),
    Deadline.find({
      $and: [
        { dueDate: { $gte: now } },
        {
          $or: [
            { student: profile._id },
            { semester: { $in: semesterNumbers } },
            { student: null },
            { semester: null },
          ],
        },
      ],
    })
      .sort({ dueDate: 1 })
      .limit(10)
      .lean(),
    Event.find({
      'participants.participant': req.user!.id,
      date: { $gte: now },
    })
      .populate('organizer', 'name email')
      .sort({ date: 1 })
      .limit(10)
      .lean(),
    StudentCourse.find({
      student: profile._id,
      status: 'pending',
    })
      .populate('course', 'courseCode courseName credits')
      .lean(),
    Thesis.findOne({ student: profile._id }).sort({ version: -1 }).lean(),
    Notification.countDocuments({
      user: req.user!.id,
      isRead: false,
    }),
  ]);

  const nextMilestone = milestones.find((m: any) => m.status !== 'completed') || null;

  res.status(200).json({
    success: true,
    data: {
      profile,
      currentSemester,
      credits,
      milestones,
      nextMilestone,
      upcomingDeadlines,
      upcomingEvents,
      pendingCourseRequests,
      thesis,
      unreadNotifications,
    },
  });
});

export const getMyEvents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { upcoming } = req.query;

  const filter: Record<string, any> = { 'participants.participant': req.user!.id };
  if (upcoming === 'true') {
    filter.date = { $gte: new Date() };
  }

  const events = await Event.find(filter)
    .populate('organizer', 'name email')
    .populate('semester', 'semesterNumber academicYear')
    .sort({ date: 1 })
    .lean();

  res.status(200).json({ success: true, data: events });
});

export const getMyDeadlines = asyncHandler(async (req: AuthRequest, res: Response) => {
  const profile = await StudentProfile.findOne({ user: req.user!.id });
  if (!profile) {
    throw new AppError('Student profile not found', 404);
  }

  const semesterDocs = await Semester.find({ student: profile._id }).select('semesterNumber').lean();
  const semesterNumbers = semesterDocs.map((s) => s.semesterNumber);

  const filter: Record<string, any> = {
    $or: [
      { student: profile._id },
      { semester: { $in: semesterNumbers } },
      { student: null },
      { semester: null },
    ],
  };

  if (req.query.upcoming === 'true') {
    filter.dueDate = { $gte: new Date() };
  }

  // ponytail: capped at 100 — add pagination if students ever need full history
  const deadlines = await Deadline.find(filter).sort({ dueDate: 1 }).limit(100).lean();

  res.status(200).json({ success: true, data: deadlines });
});

export const getMyForms = asyncHandler(async (req: AuthRequest, res: Response) => {
  const profile = await StudentProfile.findOne({ user: req.user!.id });
  if (!profile) {
    throw new AppError('Student profile not found', 404);
  }

  const currentSemester = await Semester.findOne({ student: profile._id }).sort({ semesterNumber: -1 });

  let query: any;
  if (currentSemester && currentSemester.semesterNumber) {
    query = Form.find({
      $and: [
        {
          $or: [
            { studentTypeApplicable: { $size: 0 } },
            { studentTypeApplicable: profile.studentType },
          ],
        },
        {
          $or: [
            { semesterApplicable: { $size: 0 } },
            { semesterApplicable: currentSemester.semesterNumber },
          ],
        },
      ],
    });
  } else {
    query = Form.find({
      $or: [
        { studentTypeApplicable: { $size: 0 } },
        { studentTypeApplicable: profile.studentType },
      ],
    });
  }

  const forms = await query.lean();

  res.status(200).json({ success: true, data: forms });
});

export const getMyMilestones = asyncHandler(async (req: AuthRequest, res: Response) => {
  const profile = await StudentProfile.findOne({ user: req.user!.id });
  if (!profile) {
    throw new AppError('Student profile not found', 404);
  }

  const milestones = await getMilestones(profile._id.toString());

  res.status(200).json({ success: true, data: milestones });
});
