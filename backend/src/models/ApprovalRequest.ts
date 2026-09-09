import mongoose, { Schema, Document } from 'mongoose';
import { IApprovalRequest, ApprovalStatus } from '../types';

export interface IApprovalRequestDocument extends IApprovalRequest, Document {}

const approvalRequestSchema = new Schema<any>(
  {
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    status: { type: String, enum: Object.values(ApprovalStatus), default: ApprovalStatus.PENDING },
    data: { type: Schema.Types.Mixed, default: {} },
    reviewer: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewComment: { type: String },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

export const ApprovalRequest = mongoose.model<IApprovalRequestDocument>(
  'ApprovalRequest',
  approvalRequestSchema
);

