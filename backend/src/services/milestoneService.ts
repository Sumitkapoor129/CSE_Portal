import mongoose from 'mongoose';
import { Milestone } from '../models/Milestone';
import { MilestoneKey, MilestoneStatus } from '../types';
import { AppError } from '../middleware/errorHandler';

interface MilestoneSeed {
  key: MilestoneKey;
  title: string;
  description: string;
  order: number;
}

export const DEFAULT_MILESTONES: MilestoneSeed[] = [
  { key: MilestoneKey.ADMISSION, title: 'Admission & Enrolment', description: 'Official admission into the PhD programme and enrolment for the first semester.', order: 0 },
  { key: MilestoneKey.SRC_FORMED, title: 'SRC Formation', description: 'Formation of the Student Research Committee (SRC) to guide the research work.', order: 1 },
  { key: MilestoneKey.COURSE_WORK, title: 'Course Work Completion', description: 'Successful completion of all prescribed course work credits.', order: 2 },
  { key: MilestoneKey.COMPREHENSIVE_EXAM, title: 'Comprehensive Examination', description: 'Clearing the comprehensive examination covering the research area.', order: 3 },
  { key: MilestoneKey.TOPIC_REGISTRATION, title: 'Topic Registration Seminar', description: 'Presentation of the research topic for formal registration.', order: 4 },
  { key: MilestoneKey.ENHANCEMENT_SEMINAR, title: 'Stipend Enhancement Seminar', description: 'Seminar presented for stipend enhancement approval.', order: 5 },
  { key: MilestoneKey.PRE_SUBMISSION, title: 'Pre-Submission Seminar', description: 'Pre-submission seminar presenting the final thesis draft.', order: 6 },
  { key: MilestoneKey.THESIS_SUBMITTED, title: 'Thesis Submission', description: 'Formal submission of the completed thesis to the department.', order: 7 },
  { key: MilestoneKey.THESIS_APPROVED, title: 'Thesis Approval', description: 'Approval of the submitted thesis by the examiners and committee.', order: 8 },
  { key: MilestoneKey.DEFENSE, title: 'Oral Defence / Viva-Voce', description: 'Successful oral defence of the thesis in the viva-voce examination.', order: 9 },
  { key: MilestoneKey.DEGREE_AWARDED, title: 'Degree Award', description: 'Award of the doctoral degree upon completion of all requirements.', order: 10 },
];

export const seedMilestones = async (studentId: string): Promise<void> => {
  const docs = DEFAULT_MILESTONES.map((m) => ({
    student: new mongoose.Types.ObjectId(studentId),
    key: m.key,
    title: m.title,
    description: m.description,
    status: MilestoneStatus.PENDING,
    order: m.order,
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
    milestone.dueDate = updates.dueDate;
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
