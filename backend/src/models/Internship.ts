import mongoose, { Schema, Document } from 'mongoose';
import { IInternship, InternshipStatus } from '../types';

export interface IInternshipDocument extends IInternship, Document {}

const internshipSchema = new Schema<any>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
    organization: { type: String, required: true, trim: true },
    researchTopic: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    durationMonths: { type: Number, required: true, min: 1, max: 18 },
    status: {
      type: String,
      enum: Object.values(InternshipStatus),
      default: InternshipStatus.PENDING,
    },
    supervisorComment: { type: String, default: '' },
    adminComment: { type: String, default: '' },
  },
  { timestamps: true }
);

internshipSchema.index({ student: 1, createdAt: -1 });
internshipSchema.index({ status: 1 });

export const Internship = mongoose.model<IInternshipDocument>('Internship', internshipSchema);
