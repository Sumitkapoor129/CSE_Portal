import mongoose, { Schema, Document } from 'mongoose';
import { IRefreshToken } from '../types';

export interface IRefreshTokenDocument extends IRefreshToken, Document {}

const refreshTokenSchema = new Schema<any>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ user: 1, expiresAt: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model<IRefreshTokenDocument>('RefreshToken', refreshTokenSchema);