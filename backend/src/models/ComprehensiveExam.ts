import mongoose, { Schema, Document } from 'mongoose';
import { IComprehensiveExam, ComprehensiveExamResult } from '../types';

export interface IComprehensiveExamDocument extends IComprehensiveExam, Document {}

const comprehensiveExamSchema = new Schema<any>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
    attemptNumber: { type: Number, required: true, min: 1, max: 2 },
    examDate: { type: Date, required: true },
    result: {
      type: String,
      enum: Object.values(ComprehensiveExamResult),
      default: ComprehensiveExamResult.SCHEDULED,
    },
    retakeDeadline: { type: Date },
    remarks: { type: String, default: '' },
    conductedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

comprehensiveExamSchema.index({ student: 1, attemptNumber: 1 }, { unique: true });
comprehensiveExamSchema.index({ student: 1, examDate: -1 });

export const ComprehensiveExam = mongoose.model<IComprehensiveExamDocument>(
  'ComprehensiveExam',
  comprehensiveExamSchema
);
