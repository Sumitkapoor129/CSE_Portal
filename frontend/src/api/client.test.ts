// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, ApiError, clearStoredToken, setStoredToken, TOKEN_KEY } from './client';

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
});
