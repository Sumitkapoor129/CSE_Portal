import mongoose, { Schema, Document } from 'mongoose';
import { IDocument, ApprovalStatus } from '../types';

export interface IDocumentModelDocument extends IDocument, Document {}

const documentSchema = new Schema<any>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
    semester: { type: Schema.Types.ObjectId, ref: 'Semester' },
    documentName: { type: String, required: true, trim: true },
    documentType: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadDate: { type: Date, default: Date.now },
    approvalStatus: { type: String, enum: Object.values(ApprovalStatus), default: ApprovalStatus.PENDING },
  },
  { timestamps: true }
);

export const DocumentModel = mongoose.model<IDocumentModelDocument>(
  'Document',
  documentSchema
);

