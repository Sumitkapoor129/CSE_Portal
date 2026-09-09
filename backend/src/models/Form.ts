import mongoose, { Schema, Document } from 'mongoose';
import { IForm, StudentType } from '../types';

export interface IFormDocument extends IForm, Document {}

const formSchema = new Schema<any>(
  {
    formName: { type: String, required: true, trim: true },
    formType: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true },
    semesterApplicable: [{ type: Number }],
    studentTypeApplicable: [{ type: String, enum: Object.values(StudentType) }],
    department: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Form = mongoose.model<IFormDocument>('Form', formSchema);

