import { apiFetch } from './client';
import type { AuthUser } from '../types';

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
    return apiFetch<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },
  register(payload: RegisterPayload) {
    return apiFetch<{ token: string; user: AuthUser; message: string }>('/auth/register', {
      method: 'POST',
      body: payload,
    });
  },
  verifyOtp(email: string, otp: string) {
    return apiFetch<{ message: string }>('/auth/verify-otp', {
      method: 'POST',
      body: { email, otp },
    });
  },
  me() {
    return apiFetch<AuthUser & { profile?: unknown }>('/auth/me');
  },
  changePassword(currentPassword: string, newPassword: string) {
    return apiFetch<{ message: string }>('/auth/change-password', {
      method: 'PUT',
      body: { currentPassword, newPassword },
    });
  },
};
