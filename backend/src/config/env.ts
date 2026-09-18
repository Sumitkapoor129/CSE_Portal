import dotenv from 'dotenv';
dotenv.config();

const isProduction = (process.env.NODE_ENV || 'development') === 'production';

const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_change_me';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

if (isProduction) {
  if (!process.env.JWT_SECRET || jwtSecret === 'fallback_secret_change_me') {
    throw new Error('JWT_SECRET must be set in production');
  }
  if (!process.env.ADMIN_PASSWORD || adminPassword === 'admin123') {
    throw new Error('ADMIN_PASSWORD must be set in production');
  }
}

const otpExpiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10);
if (Number.isNaN(otpExpiryMinutes) || otpExpiryMinutes <= 0) {
  throw new Error('OTP_EXPIRY_MINUTES must be a positive number');
}

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/cse_portal',
  JWT_SECRET: jwtSecret,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  OTP_EXPIRY_MINUTES: otpExpiryMinutes,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@college.edu',
  ADMIN_PASSWORD: adminPassword,
  ADMIN_NAME: process.env.ADMIN_NAME || 'System Administrator',
  CORS_ORIGINS: process.env.CORS_ORIGINS || '',
};
