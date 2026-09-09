# Task 3 Brief: Auth state, generic `useApi` hook, and route guard

Full plan: `docs/superpowers/plans/2026-09-08-frontend-implementation.md` (lines 1009–1347)
Backend contract: `C:\Users\91983\Desktop\VibeCoded\CSE_portal\src\routes\authRoutes.ts` (POST /auth/login, /auth/register, /auth/verify-otp; GET /auth/me; PUT /auth/change-password — all real routes).

IMPORTANT REPO RULES:
- This repo has NO git. Do NOT run `git add`/`git commit`/`git init`. Skip the plan's commit step.
- Work from repo root `C:\Users\91983\Desktop\VibeCoded\CSE_portal`. All frontend code under `frontend/`.
- NEVER add code comments. No emoji.
- TDD: write the failing tests FIRST, confirm RED, then implement, then GREEN.
- `jsdom@^25` is ALREADY installed (Task 2). This task only installs `@testing-library/react@^16`.
- Base `apiFetch` already exists at `frontend/src/api/client.ts` (import it, do not duplicate).

## Known risks / anticipated fixes (INSTRUCTED)
1. `auth.test.ts` in the plan has NO `// @vitest-environment jsdom` pragma, but `apiFetch` references `window.location.origin` at call time and `clearStoredToken()` touches `localStorage`. Vitest's node environment may not define `window` (it does provide a minimal `localStorage`). If `auth.test.ts` FAILS with a ReferenceError for `window` (or fails for any jsdom-only API), add `// @vitest-environment jsdom` at the top of `auth.test.ts`. This is the minimal, consistent fix. Do NOT change the test's assertions.
2. Never weaken tsconfig strictness or lint rules to make tests pass. Fix causally in source/test setup only.
3. If React `act(...)` environment warnings or errors appear from `@testing-library/react`, the standard minimal fix is to add `globalThis.IS_REACT_ACT_ENVIRONMENT = true;` at the top of the test file. Only apply if actually needed.

## Step 0 — Install test dependency
Workdir `frontend`: `npm install -D @testing-library/react@^16` (jsdom already present).

## Step 1 — Write the two failing test files (TDD, exact contents)

### `frontend/src/api/auth.test.ts`
```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authApi } from './auth';
import { clearStoredToken, setStoredToken } from './client';

afterEach(() => {
  vi.restoreAllMocks();
  clearStoredToken();
});

describe('authApi', () => {
  it('login posts credentials and stores no token itself', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { token: 't1', user: { id: 'u1', name: 'A', email: 'a@b.c', role: 'student' } } }),
    } as unknown as Response);
    const res = await authApi.login('a@b.c', 'secret1');
    expect(res.user.email).toBe('a@b.c');
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body).toEqual({ email: 'a@b.c', password: 'secret1' });
  });

  it('verifyOtp posts email and otp', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { message: 'verified' } }),
    } as unknown as Response);
    const res = await authApi.verifyOtp('a@b.c', '123456');
    expect(res.message).toBe('verified');
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/auth/verify-otp');
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ email: 'a@b.c', otp: '123456' });
  });
});
```

### `frontend/src/hooks/useApi.test.ts`
```ts
// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useApi } from './useApi';

describe('useApi', () => {
  it('flows through loading -> data', async () => {
    const fetcher = vi.fn().mockResolvedValue([1, 2, 3]);
    const { result } = renderHook(() => useApi<number[]>(fetcher));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([1, 2, 3]);
    expect(result.current.error).toBeNull();
  });

  it('captures error string on rejection', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useApi<number[]>(fetcher));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('boom');
  });

  it('refetch re-runs the fetcher', async () => {
    let calls = 0;
    const fetcher = vi.fn(async () => ++calls);
    const { result } = renderHook(() => useApi<number>(fetcher));
    await waitFor(() => expect(result.current.data).toBe(1));
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.data).toBe(2));
  });
});
```

## Step 2 — Run `npm test` → EXPECTED RED: modules `./auth` and `./useApi` not found (2 new failing suites), existing 14 tests still pass.

## Step 3 — Implement (exact contents)

### `frontend/src/api/auth.ts`
```ts
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
```

### `frontend/src/hooks/useApi.ts`
```ts
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcherRef
      .current()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick, ...deps]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { data, loading, error, refetch };
}
```

### `frontend/src/context/AuthContext.tsx`
```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth';
import { clearStoredToken, getStoredToken, setStoredToken } from '../api/client';
import type { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  initializing: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  const reload = useCallback(async () => {
    if (!getStoredToken()) {
      setUser(null);
      return;
    }
    try {
      const me = await authApi.me();
      setUser({ id: me.id, name: me.name, email: me.email, role: me.role, isActive: me.isActive });
    } catch {
      clearStoredToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    reload().finally(() => setInitializing(false));
  }, [reload]);

  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setStoredToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, initializing, login, logout, reload }),
    [user, initializing, login, logout, reload]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

### `frontend/src/hooks/useAuth.ts` (re-export convenience)
```ts
export { useAuth } from '../context/AuthContext';
```

### `frontend/src/components/shared/ProtectedRoute.tsx`
```tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/auth/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return null;
}
```

## Step 4 — Verify
Workdir `frontend`, in order:
```
npm test          (expect ALL suites green: setup 1 + validators 4 + formatDate 5 + client 4 + auth 2 + useApi 3 = 19 tests)
npm run lint
npm run typecheck
npm run build
```
All must pass. Fix causally if not.

## Report back
1. Files created (paths).
2. RED proof (failing module names) then GREEN counts.
3. Whether you applied the jsdom pragma to `auth.test.ts` (anticipated) and/or the IS_REACT_ACT_ENVIRONMENT flag, with the failure text that motivated each.
4. Full verification output summary (test/lint/typecheck/build).
5. Any other deviations with reasons.
6. Confirm no git commands were run.