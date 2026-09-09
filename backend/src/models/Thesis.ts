import mongoose, { Schema, Document } from 'mongoose';
import { IThesis, ThesisStatus } from '../types';

export interface IThesisDocument extends IThesis, Document {}

const thesisSchema = new Schema<any>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
    title: { type: String, required: true, trim: true },
    documentUrl: { type: String, required: true },
    submissionDate: { type: Date, default: Date.now },
    version: { type: Number, default: 1, min: 1 },
    status: { type: String, enum: Object.values(ThesisStatus), default: ThesisStatus.DRAFT },
    supervisorComments: { type: String },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

export const Thesis = mongoose.model<IThesisDocument>('Thesis', thesisSchema);

