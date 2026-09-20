import mongoose from 'mongoose';
import { Milestone } from '../models/Milestone';
import { MilestoneKey, MilestoneStatus } from '../types';
import { AppError } from '../middleware/errorHandler';

import { StudentProfile } from '../models/StudentProfile';

interface MilestoneSeed {
  key: MilestoneKey;
  title: string;
  description: string;
  order: number;
}

export const DEFAULT_MILESTONES: MilestoneSeed[] = [
  { key: MilestoneKey.ADMISSION, title: 'Admission & Enrolment', description: 'Official admission into the PhD programme and enrolment for the first semester.', order: 0 },
  { key: MilestoneKey.SRC_FORMED, title: 'SRC Formation', description: 'Formation of the Student Research Committee (SRC) within 2 weeks of joining.', order: 1 },
  { key: MilestoneKey.COURSE_WORK, title: 'Course Work Completion', description: 'Successful completion of all prescribed course work credits within 2 years.', order: 2 },
  { key: MilestoneKey.COMPREHENSIVE_EXAM, title: 'Comprehensive Examination', description: 'Clearing the comprehensive examination covering the research area (max 2 attempts).', order: 3 },
  { key: MilestoneKey.TOPIC_REGISTRATION, title: 'Topic Registration Seminar', description: 'Presentation of research topic for registration (within 6 months of comprehensive exam).', order: 4 },
  { key: MilestoneKey.ENHANCEMENT_SEMINAR, title: 'Stipend Enhancement Seminar', description: 'Seminar presented for stipend enhancement approval after 24 months (2 years).', order: 5 },
  { key: MilestoneKey.EXTENSION_SEMINAR, title: 'Extension Seminar (4th Year)', description: 'Seminar presentation after 48 months (4 years) if research work is incomplete.', order: 6 },
  { key: MilestoneKey.PRE_SUBMISSION, title: 'Pre-Submission Seminar', description: 'Pre-submission seminar presenting the final thesis draft (earliest 2.5 years).', order: 7 },
  { key: MilestoneKey.THESIS_SUBMITTED, title: 'Thesis Submission', description: 'Formal submission of completed thesis (within 2 months of pre-submission).', order: 8 },
  { key: MilestoneKey.THESIS_APPROVED, title: 'Thesis Approval', description: 'Approval of the submitted thesis by the external examiners and committee.', order: 9 },
  { key: MilestoneKey.DEFENSE, title: 'Oral Defence / Viva-Voce', description: 'Successful oral defence of the thesis in the viva-voce examination.', order: 10 },
  { key: MilestoneKey.DEGREE_AWARDED, title: 'Degree Award', description: 'Award of the doctoral degree upon completion of all requirements at convocation.', order: 11 },
];

export const calculateMilestoneDueDate = (key: MilestoneKey, admissionDate: Date): Date | undefined => {
  const baseTime = admissionDate.getTime();
  const DAY_MS = 86400000;
  switch (key) {
    case MilestoneKey.SRC_FORMED:
      return new Date(baseTime + 14 * DAY_MS);
    case MilestoneKey.COURSE_WORK:
    case MilestoneKey.TOPIC_REGISTRATION:
    case MilestoneKey.ENHANCEMENT_SEMINAR:
      return new Date(baseTime + 730 * DAY_MS); // 2 years
    case MilestoneKey.EXTENSION_SEMINAR:
      return new Date(baseTime + 1460 * DAY_MS); // 4 years
    case MilestoneKey.PRE_SUBMISSION:
      return new Date(baseTime + 913 * DAY_MS); // 2.5 years
    default:
      return undefined;
  }
};

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
    status: m.key === MilestoneKey.ADMISSION ? MilestoneStatus.COMPLETED : MilestoneStatus.PENDING,
    order: m.order,
    dueDate: admissionDate ? calculateMilestoneDueDate(m.key, admissionDate) : undefined,
    completedAt: m.key === MilestoneKey.ADMISSION ? (admissionDate || new Date()) : undefined,
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
  }

  if (updates.dueDate !== undefined) {
    milestone.dueDate = updates.dueDate ? new Date(updates.dueDate) : undefined;
  }
  if (updates.title !== undefined) {
    milestone.title = updates.title;
  }
  if (updates.description !== undefined) {
    milestone.description = updates.description;
  }

  if (milestone.status === MilestoneStatus.COMPLETED) {
    milestone.completedAt = new Date();
  } else {
    milestone.completedAt = undefined;
  }

  milestone.updatedBy = updaterUserId;
  await milestone.save();
  return milestone;
};
