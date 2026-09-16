import mongoose, { Schema, Document } from 'mongoose';
import { IStudentCourse, ApprovalStatus } from '../types';

export interface IStudentCourseDocument extends IStudentCourse, Document {}

const studentCourseSchema = new Schema<any>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    semester: { type: Schema.Types.ObjectId, ref: 'Semester', required: true },
    status: { type: String, enum: Object.values(ApprovalStatus), default: ApprovalStatus.PENDING },
    supervisorComment: { type: String },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

studentCourseSchema.index({ student: 1, status: 1 });

export const StudentCourse = mongoose.model<IStudentCourseDocument>(
  'StudentCourse',
  studentCourseSchema
);

