import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { FacultyProfile } from '../models/FacultyProfile';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { createOTPRecord, verifyOTPRecord } from '../utils/otp';
import { sendOTPEmail } from '../utils/email';
import { seedMilestones } from '../services/milestoneService';
import { UserRole, AuthRequest } from '../types';
import { generateAccessToken, createRefreshSession, refreshUseCase, revokeRefreshToken } from '../utils/tokens';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buildUserPayload = async (
  user: { _id: unknown; name: string; email: string; role: UserRole },
  existingProfile?: { profilePhoto?: string; isProfileComplete?: boolean } | null
) => {
  const profile = existingProfile ?? (
    user.role === UserRole.STUDENT
      ? await StudentProfile.findOne({ user: user._id })
      : await FacultyProfile.findOne({ user: user._id })
  );
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    profilePhoto: profile?.profilePhoto ?? null,
    ...(user.role === UserRole.STUDENT && { isProfileComplete: (profile as { isProfileComplete?: boolean } | null)?.isProfileComplete }),
  };
};

export const registerStudent = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name, collegeId, rollNumber, studentType, department } = req.body;

  const missing: Record<string, string> = {};
  for (const f of ['email', 'password', 'name', 'collegeId', 'rollNumber', 'studentType', 'department'] as const) {
    if (!req.body[f]) missing[f] = 'This field is required.';
  }
  if (Object.keys(missing).length > 0) throw new AppError('Please complete all required fields.', 400, missing);

  if (!EMAIL_REGEX.test(email)) throw new AppError('Enter a valid email address.', 400, { email: 'Enter a valid email address.' });
  if (password.length < 6) throw new AppError('Password must be at least 6 characters.', 400, { password: 'Password must be at least 6 characters.' });

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) throw new AppError('An account with this email already exists. Try logging in.', 409, { email: 'This email is already registered.' });

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    email: email.toLowerCase(),
    password: hashedPassword,
    name,
    role: UserRole.STUDENT,
    isActive: false,
  });

  const profile = await StudentProfile.create({
    user: user._id,
    collegeId,
    rollNumber,
    studentType,
    department,
    admissionDate: new Date(),
  });

  await seedMilestones(profile._id.toString());

  const otp = await createOTPRecord(user.email);
  await sendOTPEmail(user.email, otp);

  const accessToken = generateAccessToken({ id: user._id.toString(), role: user.role, email: user.email });
  const { token: refreshToken } = await createRefreshSession(user._id.toString());
  const payload = await buildUserPayload(user);

  res.status(201).json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: payload,
      message: 'OTP sent to your email. Please verify to activate your account.',
    },
  });
});

export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp) throw new AppError('Email and OTP are required.', 400, {
    ...(email ? {} : { email: 'Email is required.' }),
    ...(otp ? {} : { otp: 'OTP is required.' }),
  });
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new AppError('No account found with this email. Register first.', 404, { email: 'This email is not registered.' });
  if (user.isActive) throw new AppError('Account is already verified. You can log in.', 400);
  const isValid = await verifyOTPRecord(email.toLowerCase(), otp);
  if (!isValid) throw new AppError('Invalid or expired OTP. Check and try again.', 400, { otp: 'The OTP is invalid or has expired.' });

  user.isActive = true;
  await user.save();

  res.status(200).json({
    success: true,
    data: { message: 'Email verified successfully. Your account is now active.' },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) throw new AppError('Email and password are required.', 400, {
    ...(email ? {} : { email: 'Email is required.' }),
    ...(password ? {} : { password: 'Password is required.' }),
  });

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) throw new AppError('No account found with this email.', 401, { email: 'No account is registered with this email.' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new AppError('Incorrect password. Please try again.', 401, { password: 'The password you entered is incorrect.' });

  if (!user.isActive) throw new AppError('Account not verified. Please verify your email first.', 403, { email: 'Verify your email before logging in.' });

  const accessToken = generateAccessToken({ id: user._id.toString(), role: user.role, email: user.email });
  const { token: refreshToken } = await createRefreshSession(user._id.toString());
  const payload = await buildUserPayload(user);

  res.status(200).json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: payload,
    },
  });
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken: raw } = req.body;
  if (!raw) throw new AppError('refreshToken is required', 400, { refreshToken: 'Refresh token is required.' });
  const result = await refreshUseCase(raw);
  if (!result.ok) {
    const message = result.reason === 'expired'
      ? 'Session expired. Please log in again.'
      : 'Invalid session. Please log in again.';
    throw new AppError(message, 401, { refreshToken: message });
  }
  res.status(200).json({ success: true, data: result });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken: raw } = req.body;
  if (raw) await revokeRefreshToken(raw);
  res.status(200).json({ success: true, data: { message: 'Logged out successfully.' } });
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!.id).lean();
  if (!user) {
    throw new AppError('User not found', 404);
  }
  const profile = user.role === UserRole.STUDENT
    ? await StudentProfile.findOne({ user: user._id })
      .populate('supervisor', 'employeeId department designation')
      .populate('coSupervisor', 'employeeId department designation')
      .populate('srcCommittee')
      .lean()
    : await FacultyProfile.findOne({ user: user._id }).lean();
  res.status(200).json({
    success: true,
    data: {
      ...(await buildUserPayload(user, profile)),
      isActive: user.isActive,
      profile,
    },
  });
});

export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError('Current and new passwords are required', 400);
  }

  if (newPassword.length < 6) {
    throw new AppError('New password must be at least 6 characters', 400);
  }

  const user = await User.findById(req.user!.id).select('+password');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 401);
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.status(200).json({
    success: true,
    data: { message: 'Password updated successfully' },
  });
});
