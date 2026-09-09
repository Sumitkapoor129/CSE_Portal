import mongoose, { Schema, Document } from 'mongoose';
import { ISRCCommittee, ISRCMember, SRCMemberRole } from '../types';

export interface ISRCCommitteeDocument extends ISRCCommittee, Document {}

const srcMemberSchema = new Schema<any>(
  {
    faculty: { type: Schema.Types.ObjectId, ref: 'FacultyProfile', required: true },
    role: { type: String, enum: Object.values(SRCMemberRole), required: true },
  },
  { _id: false }
);

const srcCommitteeSchema = new Schema<any>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true, unique: true },
    members: [srcMemberSchema],
  },
  { timestamps: true }
);

export const SRCCommittee = mongoose.model<ISRCCommitteeDocument>(
  'SRCCommittee',
  srcCommitteeSchema
);

