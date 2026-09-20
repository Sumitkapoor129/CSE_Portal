import mongoose from 'mongoose';
import { Request, Response } from 'express';
import { Supervisor } from '../models/Supervisor';
import { StudentProfile } from '../models/StudentProfile';
import { FacultyProfile } from '../models/FacultyProfile';
import { StudentCourse } from '../models/StudentCourse';
import { Thesis } from '../models/Thesis';
import { Event } from '../models/Event';
import { ApprovalRequest } from '../models/ApprovalRequest';
import { Semester } from '../models/Semester';
import { Course } from '../models/Course';
import { Credits } from '../models/Credits';
import { DocumentModel } from '../models/Document';
import { SRCCommittee } from '../models/SRCCommittee';
import { User } from '../models/User';
import { Milestone } from '../models/Milestone';
import { authenticate, authorize } from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { createAuditLog } from '../utils/audit';
import { createNotification, createBulkNotifications } from '../utils/notify';
import { resolveParticipants, getEligibleStudentOptions, getAssignedStudentUserIds, parseEventDateTime } from '../utils/participants';
import { updateMilestone as updateMilestoneService } from '../services/milestoneService';
import { sendNotificationEmail } from '../utils/email';
import { computeTotalCredits, computeCreditsForSemester } from '../services/creditService';
import { UserRole, AuthRequest, ApprovalStatus, ThesisStatus } from '../types';
import { escapeRegex } from '../utils/query';

const getFacultyProfile = async (userId: string) => {
  const profile = await FacultyProfile.findOne({ user: userId });
  if (!profile) {
    throw new AppError('Faculty profile not found', 404);
  }
  return profile;
};

const getAssignedStudentProfileIds = async (facultyProfileId: any): Promise<any[]> => {
  const supervisorRecords = await Supervisor.find({
    $or: [{ supervisor: facultyProfileId }, { coSupervisor: facultyProfileId }],
    isActive: true,
  }).select('student').lean();

  const recordStudentIds = supervisorRecords.map((s) => s.student);

  const directProfiles = await StudentProfile.find({
    $or: [
      { _id: { $in: recordStudentIds } },
      { supervisor: facultyProfileId },
      { coSupervisor: facultyProfileId },
    ],
  }).select('_id').lean();

  return directProfiles.map((p) => p._id);
};

export const getDashboard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const facultyProfile = await getFacultyProfile(req.user!.id);

  const assignedStudentIds = await getAssignedStudentProfileIds(facultyProfile._id);
  const assignedStudents = assignedStudentIds.length;

  const [pendingCourseApprovals, pendingThesisApprovals, pendingGeneralApprovals, upcomingEvents] = await Promise.all([
    StudentCourse.countDocuments({
      student: { $in: assignedStudentIds },
      status: ApprovalStatus.PENDING,
    }),
    Thesis.countDocuments({
      student: { $in: assignedStudentIds },
      status: ThesisStatus.SUBMITTED,
    }),
    ApprovalRequest.countDocuments({
      requester: { $in: assignedStudentIds },
      status: ApprovalStatus.PENDING,
    }),
    Event.countDocuments({
      organizer: req.user!.id,
      date: { $gte: new Date() },
    }),
  ]);

  const pendingApprovals =
    pendingCourseApprovals + pendingThesisApprovals + pendingGeneralApprovals;

  res.status(200).json({
    success: true,
    data: {
      assignedStudents,
      pendingApprovals,
      upcomingEvents,
      pendingCourseApprovals,
      pendingThesisApprovals,
      pendingGeneralApprovals,
    },
  });
});

export const getAssignedStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const facultyProfile = await getFacultyProfile(req.user!.id);

  const { name, rollNumber, studentType, researchArea, page = '1', limit = '20' } = req.query;

  const assignedStudentIds = await getAssignedStudentProfileIds(facultyProfile._id);

  if (assignedStudentIds.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        students: [],
        pagination: { total: 0, page: 1, totalPages: 0 },
      },
    });
  }

  const filter: Record<string, unknown> = { _id: { $in: assignedStudentIds } };

  if (rollNumber) {
    filter.rollNumber = { $regex: escapeRegex(rollNumber as string), $options: 'i' };
  }
  if (studentType) {
    filter.studentType = studentType;
  }
  if (researchArea) {
    filter.researchArea = { $regex: escapeRegex(researchArea as string), $options: 'i' };
  }

  if (name) {
    const matchedUsers = await User.find({
      name: { $regex: escapeRegex(name as string), $options: 'i' },
    }).select('_id').lean();
    const matchedUserIds = matchedUsers.map(u => u._id);
    filter.user = { $in: matchedUserIds };
  }

  const studentProfiles = StudentProfile.find(filter).populate('user', 'name email');

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  const students = await studentProfiles.skip(skip).limit(limitNum).lean();

  const total = await StudentProfile.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: {
      students,
      pagination: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
});

export const getStudentDetail = asyncHandler(async (req: AuthRequest, res: Response) => {
  const facultyProfile = await getFacultyProfile(req.user!.id);
  const { studentId } = req.params;

  const supervisorRecord = await Supervisor.findOne({
    student: studentId,
    supervisor: facultyProfile._id,
    isActive: true,
  });

  if (!supervisorRecord) {
    throw new AppError('Student is not assigned to you', 403);
  }

  const studentProfile = await StudentProfile.findById(studentId)
    .populate('user', 'name email role isActive')
    .populate({
      path: 'supervisor',
      select: 'employeeId department designation user profilePhoto',
      populate: { path: 'user', select: 'name email' },
    })
    .populate({
      path: 'coSupervisor',
      select: 'employeeId department designation user profilePhoto',
      populate: { path: 'user', select: 'name email' },
    })
    .lean();

  if (!studentProfile) {
    throw new AppError('Student not found', 404);
  }

  const semesters = await Semester.find({ student: studentId })
    .sort({ semesterNumber: 1 })
    .lean();

  const semesterIds = semesters.map((s) => s._id);

  const [courses, credits, documents, theses, srcCommittee] = await Promise.all([
    Course.find({ semester: { $in: semesterIds } })
      .populate('semester', 'semesterNumber academicYear')
      .sort({ createdAt: -1 })
      .lean(),
    Credits.find({ student: studentId })
      .populate('semester', 'semesterNumber academicYear')
      .sort({ createdAt: -1 })
      .lean(),
    DocumentModel.find({ student: studentId })
      .populate('semester', 'semesterNumber academicYear')
      .populate('uploadedBy', 'name email')
      .sort({ uploadDate: -1 })
      .lean(),
    Thesis.find({ student: studentId })
      .sort({ version: -1 })
      .lean(),
    SRCCommittee.findOne({ student: studentId })
      .populate({
        path: 'members.faculty',
        select: 'employeeId department designation user profilePhoto',
        populate: { path: 'user', select: 'name email' },
      })
      .lean(),
  ]);

  const studentCourses = await StudentCourse.find({
    student: studentId,
  })
    .populate('course', 'courseCode courseName credits grade status')
    .populate('semester', 'semesterNumber academicYear')
    .populate('approvedBy', 'name email')
    .lean();

  const timeline = semesters.map((sem) => {
    const semCourses = studentCourses.filter(
      (sc) => (sc.semester as any)._id?.toString() === sem._id.toString()
    );
    const semCredits = credits.find(
      (c) => (c.semester as any)._id?.toString() === sem._id.toString()
    );
    return {
      semester: sem,
      courses: semCourses,
      credits: semCredits || null,
    };
  });

  const creditsSummary = await computeTotalCredits(studentId, studentProfile.requiredCredits ?? 12);

  res.status(200).json({
    success: true,
    data: {
      profile: studentProfile,
      semesters,
      courses: studentCourses,
      documents,
      theses,
      srcCommittee,
      timeline,
      totalCredits: creditsSummary,
    },
  });
});

export const approveCourse = asyncHandler(async (req: AuthRequest, res: Response) => {
  const facultyProfile = await getFacultyProfile(req.user!.id);
  const { studentCourseId } = req.params;
  const { status, comment } = req.body;

  if (!status || ![ApprovalStatus.APPROVED, ApprovalStatus.REJECTED].includes(status)) {
    throw new AppError('Status must be approved or rejected', 400);
  }

  const studentCourse = await StudentCourse.findById(studentCourseId);
  if (!studentCourse) {
    throw new AppError('Course request not found', 404);
  }

  const studentProfileId = (studentCourse.student as any)?._id || studentCourse.student;

  const activeAssignment = await Supervisor.findOne({
    student: studentProfileId,
    $or: [{ supervisor: facultyProfile._id }, { coSupervisor: facultyProfile._id }],
    isActive: true,
  });

  let isAssigned = Boolean(activeAssignment);
  if (!isAssigned) {
    const studentProf = await StudentProfile.findById(studentProfileId);
    if (
      studentProf &&
      (studentProf.supervisor?.toString() === facultyProfile._id.toString() ||
        studentProf.coSupervisor?.toString() === facultyProfile._id.toString())
    ) {
      isAssigned = true;
    }
  }

  if (!isAssigned) {
    throw new AppError('This student is not assigned to you', 403);
  }

  if (studentCourse.status !== ApprovalStatus.PENDING) {
    throw new AppError('This course request has already been reviewed', 400);
  }

  const previousStatus = studentCourse.status;

  studentCourse.status = status;
  studentCourse.supervisorComment = comment || undefined;
  studentCourse.approvedBy = req.user!.id;
  studentCourse.approvedAt = new Date();
  await studentCourse.save();

  // Keep Course collection status synchronized with StudentCourse
  if (studentCourse.course) {
    await Course.findByIdAndUpdate(studentCourse.course, {
      status,
    });
  }

  await createAuditLog({
    user: req.user!.id,
    action: `course_${status.toLowerCase()}`,
    entity: 'StudentCourse',
    entityId: studentCourseId,
    previousValue: { status: previousStatus },
    newValue: { status, comment },
  });

  const studentProfile = await StudentProfile.findById(studentProfileId).populate('user', 'name');
  const course = await Course.findById(studentCourse.course);

  // Recalculate semester credits and upsert Credits collection
  try {
    const semResult = await computeCreditsForSemester(
      studentProfileId.toString(),
      studentCourse.semester.toString(),
      studentProfile?.requiredCredits ?? 12
    );
    await Credits.findOneAndUpdate(
      { student: studentProfileId, semester: studentCourse.semester },
      { earnedCredits: semResult.earned, requiredCredits: semResult.required },
      { upsert: true, new: true }
    );
  } catch (err) {
    // Non-blocking credit calculation logging
  }

  await createNotification({
    user: (studentProfile?.user as any)?._id.toString() || studentProfileId.toString(),
    title: `Course ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message: `Your course request for ${course?.courseName || 'a course'} has been ${status.toLowerCase()}.${comment ? ` Remark: ${comment}` : ''}`,
    type: 'course_approval',
    link: `/student/courses`,
  });

  res.status(200).json({
    success: true,
    data: {
      message: `Course request ${status.toLowerCase()} successfully`,
      studentCourse,
    },
  });
});

export const approveThesis = asyncHandler(async (req: AuthRequest, res: Response) => {
  const facultyProfile = await getFacultyProfile(req.user!.id);
  const { thesisId } = req.params;
  const { status, comment } = req.body;

  if (!status || ![ThesisStatus.APPROVED, ThesisStatus.REJECTED, ThesisStatus.RESUBMISSION_REQUIRED].includes(status)) {
    throw new AppError('Status must be approved, rejected, or resubmission_required', 400);
  }

  const thesis = await Thesis.findById(thesisId);
  if (!thesis) {
    throw new AppError('Thesis not found', 404);
  }

  const supervisorRecord = await Supervisor.findOne({
    student: thesis.student,
    supervisor: facultyProfile._id,
    isActive: true,
  });

  if (!supervisorRecord) {
    throw new AppError('This student is not assigned to you', 403);
  }

  const validTransitions: Record<string, ThesisStatus[]> = {
    [ThesisStatus.SUBMITTED]: [ThesisStatus.APPROVED, ThesisStatus.REJECTED, ThesisStatus.RESUBMISSION_REQUIRED],
    [ThesisStatus.UNDER_REVIEW]: [ThesisStatus.APPROVED, ThesisStatus.REJECTED, ThesisStatus.RESUBMISSION_REQUIRED],
  };

  if (!validTransitions[thesis.status]?.includes(status)) {
    throw new AppError(`Cannot transition thesis from ${thesis.status} to ${status}`, 400);
  }

  const previousStatus = thesis.status;

  thesis.status = status;
  thesis.supervisorComments = comment || undefined;
  thesis.approvedBy = req.user!.id;
  thesis.approvedAt = new Date();
  await thesis.save();

  await createAuditLog({
    user: req.user!.id,
    action: `thesis_${status.toLowerCase()}`,
    entity: 'Thesis',
    entityId: thesisId,
    previousValue: { status: previousStatus },
    newValue: { status, comment },
  });

  const studentProfile = await StudentProfile.findById(thesis.student).populate('user', 'name');

  await createNotification({
    user: (studentProfile?.user as any)?._id.toString() || thesis.student.toString(),
    title: `Thesis ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message: `Your thesis "${thesis.title}" has been ${status.toLowerCase()}.`,
    type: 'thesis_approval',
    link: '/student/thesis',
  });

  res.status(200).json({
    success: true,
    data: {
      message: `Thesis ${status.toLowerCase()} successfully`,
      thesis,
    },
  });
});

export const approveRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const facultyProfile = await getFacultyProfile(req.user!.id);
  const { requestId } = req.params;
  const { status, comment } = req.body;

  if (!status || ![ApprovalStatus.APPROVED, ApprovalStatus.REJECTED].includes(status)) {
    throw new AppError('Status must be approved or rejected', 400);
  }

  const approvalRequest = await ApprovalRequest.findById(requestId);
  if (!approvalRequest) {
    throw new AppError('Approval request not found', 404);
  }

  const supervisorRecord = await Supervisor.findOne({
    student: approvalRequest.requester,
    supervisor: facultyProfile._id,
    isActive: true,
  });

  if (!supervisorRecord) {
    throw new AppError('This request is not from your assigned student', 403);
  }

  if (approvalRequest.status !== ApprovalStatus.PENDING) {
    throw new AppError('This request has already been reviewed', 400);
  }

  const previousStatus = approvalRequest.status;

  approvalRequest.status = status;
  approvalRequest.reviewer = req.user!.id;
  approvalRequest.reviewComment = comment || undefined;
  approvalRequest.reviewedAt = new Date();
  await approvalRequest.save();

  await createAuditLog({
    user: req.user!.id,
    action: `approval_${status.toLowerCase()}`,
    entity: 'ApprovalRequest',
    entityId: requestId,
    previousValue: { status: previousStatus },
    newValue: { status, comment },
  });

  const studentProfile = await StudentProfile.findById(approvalRequest.requester).populate('user', 'name');

  await createNotification({
    user: (studentProfile?.user as any)?._id.toString() || approvalRequest.requester.toString(),
    title: `Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message: `Your ${approvalRequest.type} request has been ${status.toLowerCase()}.`,
    type: 'approval_request',
    link: '/student/approvals',
  });

  res.status(200).json({
    success: true,
    data: {
      message: `Request ${status.toLowerCase()} successfully`,
      approvalRequest,
    },
  });
});

export const createEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, eventType, description, date, startTime, endTime, location, participants, semester, deadline, eligibilityRules } = req.body;

  if (!title || !eventType || !date || !startTime || !endTime) {
    throw new AppError('Title, event type, date, start time, and end time are required', 400);
  }

  const eventDate = new Date(date);
  if (isNaN(eventDate.getTime())) {
    throw new AppError('Invalid event date', 400);
  }

  const parsedStartTime = parseEventDateTime(eventDate, startTime);
  const parsedEndTime = parseEventDateTime(eventDate, endTime);

  const { userIds, participantDocs } = await resolveParticipants(Array.isArray(participants) ? participants : []);

  if (userIds.length > 0) {
    const allowed = await getAssignedStudentUserIds(req.user!.id);
    const unauthorized = userIds.find(id => !allowed.has(id));
    if (unauthorized) {
      throw new AppError('Cannot invite a student who is not assigned to you', 403);
    }
  }

  // Handle semester ObjectId ref safely without throwing CastError
  let semesterRef: any = undefined;
  const rules = typeof eligibilityRules === 'object' && eligibilityRules !== null ? { ...eligibilityRules } : {};
  if (semester) {
    if (mongoose.isValidObjectId(semester)) {
      semesterRef = semester;
    } else {
      const semNum = Number(semester);
      if (!isNaN(semNum)) {
        rules.semesterNumber = semNum;
      }
    }
  }

  let eventDeadline: Date | undefined = undefined;
  if (deadline) {
    const parsedDl = new Date(deadline);
    if (!isNaN(parsedDl.getTime())) {
      eventDeadline = parsedDl;
    }
  }

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
    semester: semesterRef,
    deadline: eventDeadline,
    eligibilityRules: Object.keys(rules).length > 0 ? rules : undefined,
  });

  await createAuditLog({
    user: req.user!.id,
    action: 'event_created',
    entity: 'Event',
    entityId: event._id.toString(),
    newValue: { title, eventType, date: eventDate },
  });

  if (userIds.length > 0) {
    const eventMessage = `You have been invited to "${title}" on ${eventDate.toLocaleDateString()}.`;
    await createBulkNotifications(userIds, { title: 'New Event: ' + title, message: eventMessage, type: 'event_invitation', link: '/student/events' });

    const participantUsers = await User.find({ _id: { $in: userIds } }).select('email').lean();
    await Promise.allSettled(participantUsers.map((u: any) => sendNotificationEmail(u.email, 'New Event: ' + title, eventMessage)));
  }

  res.status(201).json({
    success: true,
    data: event,
  });
});

export const getEvents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20', eventType } = req.query;

  const filter: Record<string, unknown> = { organizer: req.user!.id };

  if (eventType) {
    filter.eventType = eventType;
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  const total = await Event.countDocuments(filter);
  const events = await Event.find(filter)
    .populate('participants.participant', 'name email')
    .populate('semester', 'semesterNumber academicYear')
    .sort({ date: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  res.status(200).json({
    success: true,
    data: {
      events,
      pagination: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
});

export const getEligibleStudents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const options = await getEligibleStudentOptions(req.user!.id);
  res.status(200).json({
    success: true,
    data: options,
  });
});

export const updateMilestone = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, dueDate, title, description } = req.body;

  const milestone = await Milestone.findById(id);
  if (!milestone) {
    throw new AppError('Milestone not found', 404);
  }

  const facultyProfile = await getFacultyProfile(req.user!.id);

  const supervisorRecord = await Supervisor.findOne({
    student: milestone.student,
    supervisor: facultyProfile._id,
    isActive: true,
  });

  if (!supervisorRecord) {
    throw new AppError('This student is not assigned to you', 403);
  }

  const updated = await updateMilestoneService(id, req.user!.id, { status, dueDate, title, description });

  await createAuditLog({
    user: req.user!.id,
    action: 'milestone_updated',
    entity: 'Milestone',
    entityId: id,
    newValue: { status, dueDate },
  });

  res.status(200).json({
    success: true,
    data: updated,
  });
});

export const getPendingApprovals = asyncHandler(async (req: AuthRequest, res: Response) => {
  const facultyProfile = await getFacultyProfile(req.user!.id);

  const supervisorRecords = await Supervisor.find({
    supervisor: facultyProfile._id,
    isActive: true,
  });
  const assignedStudentIds = supervisorRecords.map((s) => s.student);

  if (assignedStudentIds.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        courseApprovals: [],
        thesisApprovals: [],
        generalApprovals: [],
      },
    });
  }

  const [courseApprovals, thesisApprovals, generalApprovals] = await Promise.all([
    StudentCourse.find({
      student: { $in: assignedStudentIds },
      status: ApprovalStatus.PENDING,
    })
      .populate('student', 'rollNumber studentType')
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'name email' },
      })
      .populate('course', 'courseCode courseName credits')
      .populate('semester', 'semesterNumber academicYear')
      .sort({ createdAt: -1 })
      .lean(),
    Thesis.find({
      student: { $in: assignedStudentIds },
      status: { $in: [ThesisStatus.SUBMITTED, ThesisStatus.UNDER_REVIEW] },
    })
      .populate('student', 'rollNumber studentType')
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'name email' },
      })
      .sort({ submissionDate: -1 })
      .lean(),
    ApprovalRequest.find({
      requester: { $in: assignedStudentIds },
      status: ApprovalStatus.PENDING,
    })
      .populate('requester', 'rollNumber studentType')
      .populate({
        path: 'requester',
        populate: { path: 'user', select: 'name email' },
      })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  res.status(200).json({
    success: true,
    data: {
      courseApprovals,
      thesisApprovals,
      generalApprovals,
    },
  });
});
