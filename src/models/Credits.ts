import mongoose, { Schema, Document } from 'mongoose';
import { ICredits } from '../types';

export interface ICreditsDocument extends ICredits, Document {}

const creditsSchema = new Schema<any>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
    semester: { type: Schema.Types.ObjectId, ref: 'Semester', required: true },
    earnedCredits: { type: Number, default: 0, min: 0 },
    requiredCredits: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

creditsSchema.index({ student: 1, semester: 1 }, { unique: true });

export const Credits = mongoose.model<ICreditsDocument>('Credits', creditsSchema);

