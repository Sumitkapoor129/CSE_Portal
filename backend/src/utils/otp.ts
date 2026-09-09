import bcrypt from 'bcryptjs';
import { OTP } from '../models/OTP';
import { env } from '../config/env';
import { randomInt } from 'crypto';

export const generateOTP = (): string => {
  return randomInt(100000, 999999).toString();
};

export const hashOTP = async (otp: string): Promise<string> => {
  return bcrypt.hash(otp, 10);
};

export const compareOTP = async (plain: string, hashed: string): Promise<boolean> => {
  return bcrypt.compare(plain, hashed);
};

export const createOTPRecord = async (email: string): Promise<string> => {
  const otp = generateOTP();
  const hashedOTP = await hashOTP(otp);

  await OTP.deleteMany({ email, verified: false });
  await OTP.create({
    email,
    otp: hashedOTP,
    expiresAt: new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000),
  });

  return otp;
};

export const verifyOTPRecord = async (email: string, otp: string): Promise<boolean> => {
  const record = await OTP.findOne({ email, verified: false });
  if (!record) return false;
  if (record.expiresAt < new Date()) return false;

  const isValid = await compareOTP(otp, record.otp);
  if (isValid) {
    record.verified = true;
    await record.save();
  }
  return isValid;
};
