import mongoose, { Schema, Document } from 'mongoose';

export interface IOTPDocument extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
  verified: boolean;
}

const otpSchema = new Schema<any>(
  {
    email: { type: String, required: true, lowercase: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

otpSchema.index({ email: 1, otp: 1 });

export const OTP = mongoose.model<IOTPDocument>('OTP', otpSchema);

