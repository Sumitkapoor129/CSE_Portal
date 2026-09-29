import mongoose, { Schema, Document } from 'mongoose';
import { IExternalExaminer, ExternalExaminerStatus, ExaminerCategory } from '../types';

export interface IExternalExaminerDocument extends IExternalExaminer, Document {}

const externalExaminerSchema = new Schema<any>(
  {
    thesis: { type: Schema.Types.ObjectId, ref: 'Thesis', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
    examinerName: { type: String, required: true, trim: true },
    examinerEmail: { type: String, required: true, trim: true },
    institution: { type: String, required: true, trim: true },
    invitationDate: { type: Date, required: true, default: Date.now },
    responseDueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(ExternalExaminerStatus),
      default: ExternalExaminerStatus.INVITED,
    },
    category: {
      type: String,
      enum: Object.values(ExaminerCategory),
    },
    cat3ResponseDueDate: { type: Date },
    reportUrl: { type: String, default: '' },
    remarks: { type: String, default: '' },
  },
  { timestamps: true }
);

externalExaminerSchema.index({ thesis: 1, examinerEmail: 1 }, { unique: true });
externalExaminerSchema.index({ student: 1 });
externalExaminerSchema.index({ status: 1, responseDueDate: 1 });

export const ExternalExaminer = mongoose.model<IExternalExaminerDocument>(
  'ExternalExaminer',
  externalExaminerSchema
);
