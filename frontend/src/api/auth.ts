import { apiFetch } from './client';
import type { ApiOpts } from './client';
import type { AuthUser } from '../types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  collegeId: string;
  rollNumber: string;
  studentType: 'frp' | 'erp';
  department: string;
}

export const authApi = {
  login(email: string, password: string) {
    return apiFetch<AuthTokens & { user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },
  register(payload: RegisterPayload) {
    return apiFetch<AuthTokens & { user: AuthUser; message: string }>('/auth/register', {
      method: 'POST',
      body: payload,
    });
  },
  logout(refreshToken: string) {
    return apiFetch<{ message: string }>('/auth/logout', {
      method: 'POST',
      body: { refreshToken },
    });
  },
  verifyOtp(email: string, otp: string) {
    return apiFetch<{ message: string }>('/auth/verify-otp', {
      method: 'POST',
      body: { email, otp },
    });
  },
  me(opts?: ApiOpts) {
    return apiFetch<AuthUser & { profile?: unknown }>('/auth/me', { signal: opts?.signal });
  },
  changePassword(currentPassword: string, newPassword: string) {
    return apiFetch<{ message: string }>('/auth/change-password', {
      method: 'PUT',
      body: { currentPassword, newPassword },
    });
  },
};
