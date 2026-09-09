// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authApi } from './auth';
import { clearStoredToken } from './client';

afterEach(() => {
  vi.restoreAllMocks();
  clearStoredToken();
});

describe('authApi', () => {
  it('login posts credentials and stores no token itself', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { token: 't1', user: { id: 'u1', name: 'A', email: 'a@b.c', role: 'student' } } }),
    } as unknown as Response);
    const res = await authApi.login('a@b.c', 'secret1');
    expect(res.user.email).toBe('a@b.c');
    const body = JSON.parse((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body).toEqual({ email: 'a@b.c', password: 'secret1' });
  });

  it('verifyOtp posts email and otp', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { message: 'verified' } }),
    } as unknown as Response);
    const res = await authApi.verifyOtp('a@b.c', '123456');
    expect(res.message).toBe('verified');
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/auth/verify-otp');
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ email: 'a@b.c', otp: '123456' });
  });
});
