import mongoose, { Schema, Document } from 'mongoose';
import { IDeadline } from '../types';

export interface IDeadlineDocument extends IDeadline, Document {}

const deadlineSchema = new Schema<any>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    dueDate: { type: Date, required: true },
    semester: { type: Number },
    student: { type: Schema.Types.ObjectId, ref: 'StudentProfile' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notificationSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

deadlineSchema.index({ notificationSent: 1, dueDate: 1 });
deadlineSchema.index({ student: 1, dueDate: 1 });
deadlineSchema.index({ semester: 1, dueDate: 1 });
deadlineSchema.index({ dueDate: 1 });

export const Deadline = mongoose.model<IDeadlineDocument>('Deadline', deadlineSchema);

