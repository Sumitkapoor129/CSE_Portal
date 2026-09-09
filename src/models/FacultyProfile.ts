import mongoose, { Schema, Document } from 'mongoose';
import { IFacultyProfile } from '../types';

export interface IFacultyProfileDocument extends IFacultyProfile, Document {}

const facultyProfileSchema = new Schema<any>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    employeeId: { type: String, required: true, unique: true, trim: true },
    department: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    researchAreas: [{ type: String, trim: true }],
    profilePhoto: { type: String },
  },
  { timestamps: true }
);

export const FacultyProfile = mongoose.model<IFacultyProfileDocument>(
  'FacultyProfile',
  facultyProfileSchema
);

