import mongoose, { Schema, Document } from 'mongoose';
import { IMilestone, MilestoneStatus } from '../types';

export interface IMilestoneDocument extends IMilestone, Document {}

const milestoneSchema = new Schema<any>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
    key: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: { type: String, enum: Object.values(MilestoneStatus), default: MilestoneStatus.PENDING },
    order: { type: Number, required: true, min: 0 },
    dueDate: { type: Date },
    completedAt: { type: Date },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

milestoneSchema.index({ student: 1, key: 1 }, { unique: true });
milestoneSchema.index({ student: 1, order: 1 });

export const Milestone = mongoose.model<IMilestoneDocument>('Milestone', milestoneSchema);