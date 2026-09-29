import mongoose, { Schema, Document } from 'mongoose';
import { INotification } from '../types';

export interface INotificationDocument extends INotification, Document {}

const notificationSchema = new Schema<any>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    type: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    link: { type: String },
    milestone: { type: Schema.Types.ObjectId, ref: 'Milestone' },
    dueDate: { type: Date },
    daysRemaining: { type: Number },
    severity: { type: String, enum: ['info', 'warning', 'critical'] },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

export const Notification = mongoose.model<INotificationDocument>(
  'Notification',
  notificationSchema
);

