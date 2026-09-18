import mongoose, { Schema, Document } from 'mongoose';
import { ICourse, ApprovalStatus } from '../types';

export interface ICourseDocument extends ICourse, Document {}

const courseSchema = new Schema<any>(
  {
    semester: { type: Schema.Types.ObjectId, ref: 'Semester', required: true },
    courseCode: { type: String, required: true, trim: true },
    courseName: { type: String, required: true, trim: true },
    credits: { type: Number, required: true, min: 0 },
    grade: { type: String },
    status: { type: String, enum: Object.values(ApprovalStatus), default: ApprovalStatus.PENDING },
  },
  { timestamps: true }
);

courseSchema.index({ semester: 1 });

export const Course = mongoose.model<ICourseDocument>('Course', courseSchema);

