import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { FacultyProfile } from '../models/FacultyProfile';
import { generateToken, authenticate } from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { createOTPRecord, verifyOTPRecord } from '../utils/otp';
import { sendOTPEmail } from '../utils/email';
import { seedMilestones } from '../services/milestoneService';
import { UserRole, AuthRequest } from '../types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const registerStudent = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name, collegeId, rollNumber, studentType, department } = req.body;

  if (!email || !password || !name || !collegeId || !rollNumber || !studentType || !department) {
    throw new AppError('All fields are required', 400);
  }

  if (!EMAIL_REGEX.test(email)) {
    throw new AppError('Invalid email format', 400);
  }

  if (password.length < 6) {
    throw new AppError('Password must be at least 6 characters', 400);
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('Email already registered', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

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

  const token = generateToken({
    id: user._id.toString(),
    role: user.role,
    email: user.email,
  });

  res.status(201).json({
    success: true,
    data: {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      message: 'OTP sent to your email. Please verify to activate your account.',
    },
  });
});

export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new AppError('Email and OTP are required', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.isActive) {
    throw new AppError('Account is already verified', 400);
  }

  const isValid = await verifyOTPRecord(email.toLowerCase(), otp);
  if (!isValid) {
    throw new AppError('Invalid or expired OTP', 400);
  }

  user.isActive = true;
  await user.save();

  res.status(200).json({
    success: true,
    data: { message: 'Email verified successfully. Your account is now active.' },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account not verified. Please verify your email first.', 403);
  }

  const token = generateToken({
    id: user._id.toString(),
    role: user.role,
    email: user.email,
  });

  res.status(200).json({
    success: true,
    data: {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  let profile = null;

  if (user.role === UserRole.STUDENT) {
    profile = await StudentProfile.findOne({ user: user._id })
      .populate('supervisor', 'employeeId department designation')
      .populate('coSupervisor', 'employeeId department designation')
      .populate('srcCommittee');
  } else if (user.role === UserRole.SUPERVISOR || user.role === UserRole.ADMIN) {
    profile = await FacultyProfile.findOne({ user: user._id });
  }

  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
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

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();

  res.status(200).json({
    success: true,
    data: { message: 'Password updated successfully' },
  });
});
