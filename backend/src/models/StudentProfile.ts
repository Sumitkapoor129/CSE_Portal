import mongoose, { Schema, Document } from 'mongoose';
import { IStudentProfile, StudentType } from '../types';

export interface IStudentProfileDocument extends IStudentProfile, Document { }

const studentProfileSchema = new Schema<any>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    collegeId: { type: String, required: true, unique: true, trim: true },
    rollNumber: { type: String, required: true, unique: true, trim: true },
    studentType: { type: String, enum: Object.values(StudentType), required: true },
    department: { type: String, required: true, trim: true },
    researchArea: { type: String, default: '', trim: true },
    admissionDate: { type: Date, required: true },
    requiredCredits: { type: Number, default: 12, min: 0 },
    profilePhoto: { type: String },
    dateOfBirth: { type: Date },
    gender: { type: String, trim: true },
    bloodGroup: { type: String, trim: true },
    category: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    lastDegree: { type: String, trim: true },
    institution: { type: String, trim: true },
    graduationYear: { type: Number },
    qualification: { type: String, trim: true },
    supervisor: { type: Schema.Types.ObjectId, ref: 'FacultyProfile' },
    coSupervisor: { type: Schema.Types.ObjectId, ref: 'FacultyProfile' },
    srcCommittee: { type: Schema.Types.ObjectId, ref: 'SRCCommittee' },
    isProfileComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const StudentProfile = mongoose.model<IStudentProfileDocument>(
  'StudentProfile',
  studentProfileSchema
);

