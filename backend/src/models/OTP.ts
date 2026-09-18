import mongoose, { Schema, Document } from 'mongoose';

export interface IOTPDocument extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
  verified: boolean;
  attempts: number;
}

const otpSchema = new Schema<any>(
  {
    email: { type: String, required: true, lowercase: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    verified: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

otpSchema.index({ email: 1, verified: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OTP = mongoose.model<IOTPDocument>('OTP', otpSchema);

