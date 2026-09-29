import mongoose from 'mongoose';
import { Milestone } from '../models/Milestone';
import {
  IRegistrationValidity,
  IMilestoneTimelineView,
  MilestoneKey,
  MilestoneStatus,
  StudentCategory,
} from '../types';
import { AppError } from '../middleware/errorHandler';
import { StudentProfile } from '../models/StudentProfile';
import { computeDaysRemaining } from './reminderService';

export const DAY_MS = 86400000;

/**
 * Parses a 'YYYY-MM-DD' string into a LOCAL-midnight Date.
 * Returns an invalid Date (isNaN(getTime()) === true) for garbage input,
 * including out-of-range calendar dates such as 2024-02-31 or 2024-13-01.
 */
export const parseDateOnly = (value: string): Date => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? '').trim());
  if (!match) return new Date(NaN);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return new Date(NaN);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return new Date(NaN);
  }
  return date;
};

interface MilestoneSeed {
  key: MilestoneKey;
  title: string;
  description: string;
  order: number;
  regulation: string;
  priority: 'info' | 'warning' | 'critical';
}

export const DEFAULT_MILESTONES: MilestoneSeed[] = [
  {
    key: MilestoneKey.ADMISSION,
    title: 'Admission & Enrolment',
    description: 'Official admission into the PhD programme and enrolment for the first semester.',
    regulation: 'Admission is normally in July for the Autumn semester; spring admission may be in December.',
    priority: 'info',
    order: 0,
  },
  {
    key: MilestoneKey.SRC_FORMED,
    title: 'SRC Formation',
    description: 'Formation of the Student Research Committee (SRC) within 2 weeks of joining.',
    regulation: 'SRC must be constituted within 2 weeks of joining.',
    priority: 'warning',
    order: 1,
  },
  {
    key: MilestoneKey.COURSE_WORK,
    title: 'Course Work Completion',
    description: 'Successful completion of all prescribed course work credits within 2 years.',
    regulation:
      'Coursework must be completed within 2 years of enrollment. Post-master\u2019s entrants need min 12 theory credits; direct-after-graduation entrants need min 20.',
    priority: 'critical',
    order: 2,
  },
  {
    key: MilestoneKey.COMPREHENSIVE_EXAM,
    title: 'Comprehensive Examination',
    description: 'Clearing the comprehensive examination covering the research area (max 2 attempts).',
    regulation:
      'Conducted after coursework. Max 2 attempts; if the first attempt is unsatisfactory, the second must occur within 3 months. Failure in the second attempt terminates candidature.',
    priority: 'critical',
    order: 3,
  },
  {
    key: MilestoneKey.TOPIC_REGISTRATION,
    title: 'Topic Registration Seminar',
    description: 'Presentation of research topic for registration (within 6 months of comprehensive exam).',
    regulation:
      'Topic/Registration seminar normally within 6 months after successful Comprehensive Examination and within 2 calendar years of enrollment.',
    priority: 'warning',
    order: 4,
  },
  {
    key: MilestoneKey.ENHANCEMENT_SEMINAR,
    title: 'Stipend Enhancement Seminar',
    description: 'Seminar presented for stipend enhancement approval after 24 months (2 years).',
    regulation: 'Stipend enhancement seminar after completion of 24 months (2 years) from admission.',
    priority: 'warning',
    order: 5,
  },
  {
    key: MilestoneKey.EXTENSION_SEMINAR,
    title: 'Extension Seminar (4th Year)',
    description: 'Seminar presentation after 48 months (4 years) if research work is incomplete.',
    regulation:
      'Extension seminar after 48 months (4 years) if research is incomplete; extension up to 1 year normally in 6-month periods.',
    priority: 'warning',
    order: 6,
  },
  {
    key: MilestoneKey.PRE_SUBMISSION,
    title: 'Pre-Submission Seminar',
    description: 'Pre-submission seminar presenting the final thesis draft (earliest 2.5 years).',
    regulation:
      'Pre-submission seminar only after at least 2.5 years from first registration; at least 6 months between topic registration and pre-submission; repeats within max 6 months if unsatisfactory.',
    priority: 'critical',
    order: 7,
  },
  {
    key: MilestoneKey.THESIS_SUBMITTED,
    title: 'Thesis Submission',
    description: 'Formal submission of completed thesis (within 2 months of pre-submission).',
    regulation:
      'Thesis should normally be submitted within 2 months after satisfactory pre-submission seminar/SRC recommendation; one-month extension possible on SRC recommendation.',
    priority: 'critical',
    order: 8,
  },
  {
    key: MilestoneKey.THESIS_APPROVED,
    title: 'Thesis Approval',
    description: 'Approval of the submitted thesis by the external examiners and committee.',
    regulation:
      'Board consists of 2 external examiners and supervisor(s); examiner consent/response period is 4 weeks; non-responders can be replaced.',
    priority: 'warning',
    order: 9,
  },
  {
    key: MilestoneKey.DEFENSE,
    title: 'Oral Defence / Viva-Voce',
    description: 'Successful oral defence of the thesis in the viva-voce examination.',
    regulation: 'Oral examination after thesis evaluation with SRC members and external examiner.',
    priority: 'info',
    order: 10,
  },
  {
    key: MilestoneKey.DEGREE_AWARDED,
    title: 'Degree Award',
    description: 'Award of the doctoral degree upon completion of all requirements at convocation.',
    regulation:
      'PhD award reported to Senate; degree conferred at the annual convocation subject to completion of requirements.',
    priority: 'info',
    order: 11,
  },
];

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDayOfMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDayOfMonth));
  return result;
};

export const addYears = (date: Date, years: number): Date => {
  const wholeYears = Math.floor(years);
  const months = Math.round((years - wholeYears) * 12);
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setFullYear(result.getFullYear() + wholeYears);
  result.setMonth(result.getMonth() + months);
  const lastDayOfMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDayOfMonth));
  return result;
};

export const calculateMilestoneDueDate = (key: MilestoneKey, admissionDate: Date): Date | undefined => {
  switch (key) {
    case MilestoneKey.SRC_FORMED:
      return addDays(admissionDate, 14);
    case MilestoneKey.COURSE_WORK:
    case MilestoneKey.TOPIC_REGISTRATION:
    case MilestoneKey.ENHANCEMENT_SEMINAR:
      return addYears(admissionDate, 2);
    case MilestoneKey.EXTENSION_SEMINAR:
      return addYears(admissionDate, 4);
    case MilestoneKey.PRE_SUBMISSION:
      return addYears(admissionDate, 2.5);
    default:
      return undefined;
  }
};

const AUTO_SOURCE_KEYS: MilestoneKey[] = [
  MilestoneKey.ADMISSION,
  MilestoneKey.SRC_FORMED,
  MilestoneKey.COURSE_WORK,
  MilestoneKey.TOPIC_REGISTRATION,
  MilestoneKey.ENHANCEMENT_SEMINAR,
  MilestoneKey.EXTENSION_SEMINAR,
  MilestoneKey.PRE_SUBMISSION,
];

export const seedMilestones = async (studentId: string, customAdmissionDate?: Date): Promise<void> => {
  let admissionDate = customAdmissionDate;
  if (!admissionDate) {
    const profile = await StudentProfile.findById(studentId).select('admissionDate createdAt').lean();
    admissionDate = (profile as any)?.admissionDate || (profile as any)?.createdAt || new Date();
  }

  const docs = DEFAULT_MILESTONES.map((m) => ({
    student: new mongoose.Types.ObjectId(studentId),
    key: m.key,
    title: m.title,
    description: m.description,
    regulation: m.regulation,
    priority: m.priority,
    status: m.key === MilestoneKey.ADMISSION ? MilestoneStatus.COMPLETED : MilestoneStatus.PENDING,
    order: m.order,
    dateSource: AUTO_SOURCE_KEYS.includes(m.key) ? 'auto' : 'manual',
    dueDate: admissionDate ? calculateMilestoneDueDate(m.key, admissionDate) : undefined,
    completedAt: m.key === MilestoneKey.ADMISSION ? (admissionDate || new Date()) : undefined,
    reminderLevels: [],
  }));

  try {
    await Milestone.insertMany(docs, { ordered: false });
  } catch (err: any) {
    if (err?.code === 11000) {
      return;
    }
    throw err;
  }
};

export const getMilestones = async (studentId: string) => {
  return Milestone.find({ student: studentId }).sort({ order: 1 }).lean();
};

export const updateMilestone = async (
  milestoneId: string,
  updaterUserId: string,
  updates: { status?: string; dueDate?: Date; title?: string; description?: string }
) => {
  const milestone = await Milestone.findById(milestoneId);
  if (!milestone) {
    throw new AppError('Milestone not found', 404);
  }

  if (updates.status !== undefined) {
    if (!Object.values(MilestoneStatus).includes(updates.status as MilestoneStatus)) {
      throw new AppError(`Invalid status: ${updates.status}`, 400);
    }
    milestone.status = updates.status as MilestoneStatus;

    if (milestone.status === MilestoneStatus.COMPLETED) {
      milestone.completedAt = new Date();
      milestone.reminderLevels = [];
    } else {
      milestone.completedAt = undefined;
      milestone.reminderLevels = [];
    }
  }

  if (updates.dueDate !== undefined) {
    milestone.dueDate = updates.dueDate ? new Date(updates.dueDate) : undefined;
    milestone.reminderLevels = [];
    // Any explicit dueDate override becomes manual so a later applyAdmissionDate
    // cannot clobber it (auto milestones that HAVE an auto rule stay 'auto' otherwise).
    milestone.dateSource = 'manual';
  }
  if (updates.title !== undefined) {
    milestone.title = updates.title;
  }
  if (updates.description !== undefined) {
    milestone.description = updates.description;
  }

  milestone.updatedBy = updaterUserId;
  await milestone.save();
  return milestone;
};

export const enrichMilestone = (m: any, admissionDate: Date | undefined): Record<string, unknown> => {
  const days = m.dueDate ? computeDaysRemaining(new Date(m.dueDate)) : undefined;

  let displayStatus: string;
  if (m.status === MilestoneStatus.COMPLETED) {
    displayStatus = 'completed';
  } else if (days !== undefined && days < 0) {
    displayStatus = 'overdue';
  } else if (days !== undefined && days <= 3) {
    displayStatus = 'urgent';
  } else if (days !== undefined && days <= 7) {
    displayStatus = 'due_soon';
  } else if (days !== undefined && days <= 15) {
    displayStatus = 'upcoming';
  } else if (days !== undefined) {
    displayStatus = 'planned';
  } else {
    displayStatus = m.status;
  }

  let urgencyText: string | undefined;
  if (days !== undefined) {
    if (days < 0) urgencyText = 'Overdue';
    else if (days === 0) urgencyText = 'Due today';
    else if (days === 1) urgencyText = '1 day remaining';
    else if (days <= 3) urgencyText = `${days} days remaining`;
    else if (days <= 7) urgencyText = `Due soon \u2014 ${days} days remaining`;
    else if (days <= 15) urgencyText = `Upcoming \u2014 ${days} days remaining`;
    else urgencyText = `${days} days remaining`;
  }

  return {
    ...m,
    admissionDate: admissionDate ?? null,
    ...(days !== undefined ? { daysRemaining: days } : {}),
    displayStatus,
    ...(urgencyText ? { urgencyText } : {}),
  };
};

export const getRegistrationValidity = (admissionDate: Date): IRegistrationValidity => {
  const expiryDate = addYears(admissionDate, 8);
  // Calendar-day diff (Date.UTC of local calendar days) — consistent with
  // computeDaysRemaining and immune to 24h/DST shift errors.
  const daysRemaining = computeDaysRemaining(expiryDate);
  const status: 'valid' | 'expiring_soon' | 'expired' =
    daysRemaining <= 0 ? 'expired' : daysRemaining <= 180 ? 'expiring_soon' : 'valid';
  return {
    admissionDate,
    expiryDate,
    isExpired: daysRemaining <= 0,
    daysRemaining,
    status,
  };
};

export const deriveStudentCategory = (profile: any): StudentCategory => {
  const credits = profile?.requiredCredits ?? 0;
  const lastDegree = String(profile?.lastDegree || '');
  return credits >= 20 || /b\.tech|btech|b\.e/i.test(lastDegree)
    ? 'direct_after_graduation'
    : 'post_masters';
};

export const getMilestoneTimeline = async (profile: any): Promise<IMilestoneTimelineView> => {
  const profileId = String(profile._id);
  const admissionDate = profile.admissionDate
    ? new Date(profile.admissionDate)
    : profile.createdAt
      ? new Date(profile.createdAt)
      : undefined;

  const existing = await Milestone.countDocuments({ student: profileId });
  if (existing === 0) {
    await seedMilestones(profileId, admissionDate);
  }

  const milestones: any[] = await getMilestones(profileId);
  const nonCompleted: any[] = milestones.filter((m) => m.status !== MilestoneStatus.COMPLETED);

  const overdueItems = nonCompleted
    .filter((m) => m.dueDate && computeDaysRemaining(new Date(m.dueDate)) < 0)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const futureItems = nonCompleted
    .filter((m) => m.dueDate && computeDaysRemaining(new Date(m.dueDate)) >= 0)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const upcoming = [...futureItems, ...overdueItems].map((m) => enrichMilestone(m, admissionDate));

  const nextRaw =
    overdueItems[0] ||
    futureItems[0] ||
    nonCompleted.find(
      (m) =>
        !m.dueDate &&
        (m.status === MilestoneStatus.PENDING || m.status === MilestoneStatus.IN_PROGRESS)
    ) ||
    null;
  const nextMilestone = nextRaw ? enrichMilestone(nextRaw, admissionDate) : null;

  const completed = milestones.filter((m) => m.status === MilestoneStatus.COMPLETED).length;
  const overdueCount = overdueItems.length;
  const upcomingCount = futureItems.length;

  return {
    admissionDate,
    category: deriveStudentCategory(profile),
    milestones: milestones.map((m) => enrichMilestone(m, admissionDate)) as any[],
    summary: {
      currentStage: nextRaw?.title ?? null,
      completed,
      upcoming: upcomingCount,
      overdue: overdueCount,
      total: milestones.length,
    },
    upcoming: upcoming as any[],
    nextMilestone,
    validity: admissionDate ? getRegistrationValidity(admissionDate) : null,
  };
};

export const applyAdmissionDate = async (profileId: string, admissionDate: Date): Promise<void> => {
  const milestones = await Milestone.find({ student: profileId });
  for (const milestone of milestones) {
    milestone.reminderLevels = [];
    if (milestone.dateSource === 'auto') {
      const due = calculateMilestoneDueDate(milestone.key as MilestoneKey, admissionDate);
      if (due) {
        milestone.dueDate = due;
      }
    }
    await milestone.save();
  }
};

/**
 * When a student completes pre_submission, schedule the most time-sensitive
 * remaining milestone (thesis_submitted) at completedAt + 2 months per the
 * ordinance, so reminder sweeps fire for it. Manual/TBD milestones are left
 * untouched; only unscheduled (no dueDate), not-yet-completed milestones are set.
 */
export const derivePreSubmissionDependencies = async (
  studentId: string,
  completedAt: Date
): Promise<void> => {
  const preSubmission = await Milestone.findOne({
    student: studentId,
    key: MilestoneKey.PRE_SUBMISSION,
  });
  if (!preSubmission || preSubmission.status !== MilestoneStatus.COMPLETED) return;

  const thesis = await Milestone.findOne({
    student: studentId,
    key: MilestoneKey.THESIS_SUBMITTED,
  });
  if (!thesis || thesis.dueDate || thesis.status === MilestoneStatus.COMPLETED) return;

  thesis.dueDate = addMonths(new Date(completedAt), 2);
  thesis.dateSource = 'manual';
  thesis.reminderLevels = [];
  await thesis.save();
};

let backfillRun = false;

/**
 * One-time process-wide backfill for legacy milestone docs that predate the
 * dateSource/regulation/priority/reminderLevels fields. Runs ~12 updateMany
 * calls (one per DEFAULT_MILESTONES key) and is guarded so it only runs once.
 */
export const backfillMilestoneMetadata = async (): Promise<{ updated: number }> => {
  if (backfillRun) return { updated: 0 };
  backfillRun = true;

  let updated = 0;
  for (const def of DEFAULT_MILESTONES) {
    const dateSource = AUTO_SOURCE_KEYS.includes(def.key) ? 'auto' : 'manual';
    const result = await Milestone.updateMany(
      {
        key: def.key,
        $or: [
          { dateSource: { $exists: false } },
          { regulation: { $exists: false } },
          { priority: { $exists: false } },
          { reminderLevels: { $exists: false } },
        ],
      },
      {
        $set: {
          dateSource,
          regulation: def.regulation,
          priority: def.priority,
          reminderLevels: [],
        },
      }
    );
    updated += result.modifiedCount;
  }

  return { updated };
};