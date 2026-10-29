import mongoose, { Schema, Document } from 'mongoose';
import { IDocument, ApprovalStatus } from '../types';

export interface IDocumentModelDocument extends IDocument, Document {}

const documentSchema = new Schema<any>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
    semester: { type: Schema.Types.ObjectId, ref: 'Semester' },
    semesterNumber: { type: Number, required: true, min: 1 },
    documentName: { type: String, required: true, trim: true },
    documentType: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number },
    mimeType: { type: String },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadDate: { type: Date, default: Date.now },
    approvalStatus: { type: String, enum: Object.values(ApprovalStatus), default: ApprovalStatus.PENDING },
  },
  { timestamps: true }
);

documentSchema.index({ student: 1, uploadDate: -1 });
documentSchema.index({ student: 1, semesterNumber: 1, uploadDate: -1 });

export const DocumentModel = mongoose.model<IDocumentModelDocument>(
  'Document',
  documentSchema
);

