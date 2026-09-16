// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, ApiError, clearStoredToken, REFRESH_KEY, setStoredToken, TOKEN_KEY } from './client';

function mockFetchOnce(status: number, json: unknown) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => json,
  } as unknown as Response);
}

afterEach(() => {
  vi.unstubAllGlobals();
  clearStoredToken();
});

describe('apiFetch', () => {
  it('sends bearer token and unwraps data', async () => {
    setStoredToken('abc.def.ghi');
    mockFetchOnce(200, { success: true, data: { ok: 1 } });
    const data = await apiFetch<{ ok: number }>('/dashboard');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/dashboard'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer abc.def.ghi' }),
      })
    );
    expect(data).toEqual({ ok: 1 });
  });

  it('appends query params', async () => {
    mockFetchOnce(200, { success: true, data: [] });
    await apiFetch('/students', { query: { page: 2, search: 'a b' } });
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain('page=2');
    expect(url).toContain('search=a%20b');
  });

  it('throws ApiError with server message and status', async () => {
    mockFetchOnce(409, { message: 'Duplicate / conflict' });
    await expect(apiFetch('/students')).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      message: 'Duplicate / conflict',
    });
  });

  it('clears token and dispatches auth:unauthorized on 401', async () => {
    setStoredToken('expired.token');
    mockFetchOnce(401, { message: 'Invalid or expired token' });
    const dispatched: unknown[] = [];
    const handler = (e: Event) => dispatched.push(e);
    window.addEventListener('auth:unauthorized', handler);
    await expect(apiFetch('/me')).rejects.toThrow(ApiError);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(dispatched).toHaveLength(1);
    window.removeEventListener('auth:unauthorized', handler);
  });

  it('refreshes once on 401 then retries, using stored refresh token', async () => {
    setStoredToken('expired.access');
    localStorage.setItem(REFRESH_KEY, 'valid.refresh');
    const calls = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ message: 'Invalid or expired token' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true, data: { accessToken: 'new.access', refreshToken: 'new.refresh' } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true, data: { ok: 1 } }) });
    globalThis.fetch = calls as unknown as typeof fetch;
    await apiFetch<{ ok: number }>('/me');
    expect(localStorage.getItem(TOKEN_KEY)).toBe('new.access');
    expect(localStorage.getItem(REFRESH_KEY)).toBe('new.refresh');
    const authHeaders = calls.mock.calls.map((c) => (c[1] as RequestInit).headers);
    expect(authHeaders[authHeaders.length - 1]).toEqual(expect.objectContaining({ Authorization: 'Bearer new.access' }));
  });

  it('clears tokens and dispatches auth:unauthorized when refresh fails', async () => {
    setStoredToken('expired.access');
    localStorage.setItem(REFRESH_KEY, 'dead.refresh');
    const calls = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ message: 'Invalid or expired token' }) })
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ message: 'Session expired' }) });
    globalThis.fetch = calls as unknown as typeof fetch;
    const dispatched: unknown[] = [];
    const handler = (e: Event) => dispatched.push(e);
    window.addEventListener('auth:unauthorized', handler);
    await expect(apiFetch('/me')).rejects.toThrow(ApiError);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
    expect(dispatched).toHaveLength(1);
    window.removeEventListener('auth:unauthorized', handler);
  });
});
