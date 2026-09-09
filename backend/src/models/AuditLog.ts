import mongoose, { Schema, Document } from 'mongoose';
import { IAuditLog } from '../types';

export interface IAuditLogDocument extends IAuditLog, Document {}

const auditLogSchema = new Schema<any>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String, required: true },
    previousValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ user: 1, timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLogDocument>('AuditLog', auditLogSchema);

