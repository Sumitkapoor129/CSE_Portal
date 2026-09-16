import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { RefreshToken } from '../models/RefreshToken';
import { User } from '../models/User';
import { UserRole } from '../types';

export const hashToken = (raw: string): string =>
  crypto.createHash('sha256').update(raw).digest('hex');

export const generateAccessToken = (payload: {
  id: string;
  role: UserRole;
  email: string;
}): string => {
  return jwt.sign({ ...payload, type: 'access' }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
};

const msFromEnv = (value: string): number => {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(match[1]);
  const ms = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as 's' | 'm' | 'h' | 'd'];
  return n * ms;
};

export const createRefreshSession = async (userId: string): Promise<{ token: string; expiresAt: Date }> => {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + msFromEnv(env.JWT_REFRESH_EXPIRES_IN));
  await RefreshToken.create({ user: userId, tokenHash: hashToken(token), expiresAt });
  return { token, expiresAt };
};

export const revokeRefreshToken = async (raw: string): Promise<boolean> => {
  const result = await RefreshToken.deleteOne({ tokenHash: hashToken(raw) });
  return (result.deletedCount ?? 0) > 0;
};

export type RefreshUseCaseResult =
  | { ok: true; accessToken: string; refreshToken: string; user: { id: string; role: UserRole; email: string } }
  | { ok: false; reason: 'invalid' | 'expired' };

export const refreshUseCase = async (raw: string): Promise<RefreshUseCaseResult> => {
  const doc = await RefreshToken.findOne({ tokenHash: hashToken(raw) });
  if (!doc) return { ok: false, reason: 'invalid' };
  if (doc.expiresAt.getTime() < Date.now()) {
    await doc.deleteOne();
    return { ok: false, reason: 'expired' };
  }
  const user = await User.findById(doc.user);
  if (!user) {
    await doc.deleteOne();
    return { ok: false, reason: 'invalid' };
  }
  await doc.deleteOne();
  const { token: newRefresh } = await createRefreshSession(String(user._id));
  const accessToken = generateAccessToken({ id: String(user._id), role: user.role, email: user.email });
  return {
    ok: true,
    accessToken,
    refreshToken: newRefresh,
    user: { id: String(user._id), role: user.role, email: user.email },
  };
};