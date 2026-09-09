import mongoose, { Schema, Document } from 'mongoose';
import { ISemester } from '../types';

export interface ISemesterDocument extends ISemester, Document {}

const semesterSchema = new Schema<any>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
    semesterNumber: { type: Number, required: true, min: 1 },
    academicYear: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  { timestamps: true }
);

semesterSchema.index({ student: 1, semesterNumber: 1 }, { unique: true });

export const Semester = mongoose.model<ISemesterDocument>('Semester', semesterSchema);

