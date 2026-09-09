import mongoose, { Schema, Document } from 'mongoose';
import { ISupervisor } from '../types';

export interface ISupervisorDocument extends ISupervisor, Document {}

const supervisorSchema = new Schema<any>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true, unique: true },
    supervisor: { type: Schema.Types.ObjectId, ref: 'FacultyProfile', required: true },
    coSupervisor: { type: Schema.Types.ObjectId, ref: 'FacultyProfile' },
    assignedDate: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Supervisor = mongoose.model<ISupervisorDocument>(
  'Supervisor',
  supervisorSchema
);

