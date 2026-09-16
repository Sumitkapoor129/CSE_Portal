# Report — Features F8 (Task 6) + F7 (Task 11) — Frontend Agent `fe-alpha`

**Date:** 2026-09-16
**Scope:** Refresh-aware fetch client + AuthContext (Task 6) and student onboarding wizard (Task 11).

---

## 1. What was implemented

### Task 6 — F8 refresh-aware fetch client + AuthContext

Files changed (all owned by this agent):
- `frontend/src/api/client.ts` — rewrote per plan Task 6 steps 3.
- `frontend/src/api/client.test.ts` — added the two plan-specified tests (verbatim), plus `REFRESH_KEY` to imports.
- `frontend/src/api/auth.ts` — added `AuthTokens` interface; `login`/`register` now return `AuthTokens & { user }`; added `logout(refreshToken)`. `verifyOtp`/`me`/`changePassword` untouched. `LoginPayload`/`RegisterPayload` kept exported (RegisterPage imports them).
- `frontend/src/context/AuthContext.tsx` — `login` now `setStoredTokens(res.accessToken, res.refreshToken)`; `logout` now calls `authApi.logout(refresh).catch(() => undefined)` then clears; `reload` left unchanged per plan.
- `frontend/src/types/index.ts` — `AuthUser` gained `profilePhoto?: string | null` and `isProfileComplete?: boolean`; added `StudentProfileUpdate` interface.

Produced per plan: `REFRESH_KEY`, `getStoredRefreshToken`, `setStoredTokens`, `clearStoredToken` (clears BOTH tokens), single-flight refresh with exactly one bounded retry (no recursion loops). `ApiError` gained optional 3rd constructor arg `fields?: Record<string, string>` and `doFetch` carries `fields` from error JSON. `apiFetch<T>(path, options)` signature unchanged. `const API_URL = import.meta.env.VITE_API_URL ?? '/api';` is defined before `refreshAccessToken`. A `/auth/*` path is never refresh-retried, preserving the old 401 behavior (clear both + `window.dispatchEvent(new CustomEvent('auth:unauthorized'))`).

### Task 11 — F7 onboarding wizard

Files changed/created (all owned by this agent):
- `frontend/src/types/index.ts` — `StudentProfileUpdate` (above).
- `frontend/src/api/student.ts` — `updateProfile` now takes `StudentProfileUpdate`.
- `frontend/src/pages/student/StudentOnboarding.tsx` — created verbatim from plan (3-step wizard, `STEPS`, per-step validation, `Select` leading `{ value: '', label: '…' }` entries, save via `studentApi.updateProfile` then `await reload(); navigate('/student/profile', { replace: true })`).
- `frontend/src/App.tsx` — lazy `const StudentOnboarding = lazy(() => import('./pages/student/StudentOnboarding'))` and `<Route path="complete-profile" element={<StudentOnboarding />} />` inside the `/student` route group (same `lazy`/`Suspense` pattern as existing routes).
- `frontend/src/components/layout/navConfig.ts` — kept `NAV_ITEMS` (backward compatible); added `getNavItemsForRole(user)` which returns role items and prepends `{ to: '/student/complete-profile', label: 'Complete Profile' }` for `role === 'student' && user.isProfileComplete === false`.

---

## 2. TDD evidence — Task 6

### RED (before implementation of refresh behavior)

Ran `npx vitest run src/api/client.test.ts` after adding the two new tests:

```
src/api/client.test.ts (6 tests | 2 failed)
  × apiFetch > refreshes once on 401 then retries, using stored refresh token
    → Invalid or expired token
  × apiFetch > clears tokens and dispatches auth:unauthorized when refresh fails
    → expected 'dead.refresh' to be null
Test Files  1 failed (1)
Tests  2 failed | 4 passed (6)
```

### GREEN (after implementation)

```
✓ src/api/client.test.ts (6 tests)
Test Files  1 passed (1)
Tests  6 passed (6)
```

Full-suite run later: `8 passed (8)` files, `25 passed (25)` tests.

---

## 3. Deviation from plan snippet (fix required to make the plan's tests pass)

The plan's `refreshAccessToken` snippet places the `if (!refresh) return null` check **outside** `try/finally` and clears `refreshPromise` inside the body's `finally`. Under TDD this leaked module state:

1. With no stored refresh token, the IIFE settles synchronously, so the in-body `finally` runs *before* the outer assignment `refreshPromise = (async () => {...})()` completes — the assignment then overwrites `refreshPromise` with an already-resolved `Promise<null>` that is never cleared. Result: the *next* 401/refresh attempt (the plan's new "refreshes once" test) returns the stale `null` and never refreshes. Test sequence reproduced it deterministically (test #4 → #5 fails; #5 passes alone; #6 passed only by accident).

Fix applied (behavior identical, single-flight + one bounded retry preserved): the null-refresh check was moved inside `try`, and the module flag is cleared via `return refreshPromise.finally(() => { refreshPromise = null; })` attached **after** the assignment, so cleanup always runs regardless of synchronous vs pending settlement.

This is a deliberate, minimal deviation from the plan's verbatim snippet, required to satisfy the plan's own acceptance tests. Flagging for the code-quality reviewer: alternative is to keep the snippet verbatim and lose refresh-after-no-token forever.

---

## 4. Files changed (this agent)

- `frontend/src/api/client.ts`
- `frontend/src/api/client.test.ts`
- `frontend/src/api/auth.ts`
- `frontend/src/context/AuthContext.tsx`
- `frontend/src/types/index.ts`
- `frontend/src/api/student.ts`
- `frontend/src/pages/student/StudentOnboarding.tsx` (new)
- `frontend/src/App.tsx`
- `frontend/src/components/layout/navConfig.ts`

No `git add`/`commit`/stash/checkout performed.

---

## 5. Self-review findings

- **Single-flight**: concurrent 401s share the same in-flight refresh promise; verified by the `refreshPromise` guard.
- **Exactly one retry**: recursion `doFetch(path, options, false)` sets `canRefresh=false`; no loop.
- **Bounded /auth exclusion**: `/auth/logout`, `/auth/refresh`, etc. never enter refresh path; logout-triggered 401 clears + dispatches and the AuthContext logout also clears tokens.
- **existing 401 test** (`clears token and dispatches auth:unauthorized on 401`) still passes because `clearStoredToken()` now clears both tokens.
- **Onboarding**: options arrays all include leading empty-value "Select …" entries (Select has no placeholder prop). Fields map to `StudentProfileUpdate`; empty optional fields submitted as `undefined`.
- **Route**: `complete-profile` lazy-loaded with the same pattern as sibling student routes; build verifies it is code-split (`StudentOnboarding-Oxxi7uXX.js 5.40 kB / gzip 2.10 kB`).
- **No emoji, no new dependencies, React 19 + Vite 6 + TS strict + Tailwind v4 + Vitest** respected.

## 6. Gate results

- `npx vitest run src/api/client.test.ts` → PASS (6/6).
- `npx vitest run src/api/auth.test.ts` → PASS (2/2).
- `npm run typecheck` → PASS (clean).
- `npm run build` → PASS (vite build, 104 modules).
- `npm run lint` → PASS, 0 errors + the 1 pre-existing accepted warning (`src/hooks/useApi.ts` exhaustive-deps).
- `npm test` → PASS (8 files / 25 tests).
- `src/utils/errors.test.ts` → PASS (sibling file completed in time).
- `src/components/ui/Avatar.test.tsx` — did not execute (file existed during my run; test not picked up; sibling-owned, not investigated).

---

## 7. Concerns

1. **Nav integration for `Complete Profile` item**: `NavList.tsx` (sibling-owned, not in my allowed list) still consumes `NAV_ITEMS[user.role]` directly and does not call the new `getNavItemsForRole`. To surface the conditional nav item, `NavList` (or Header/Sidebar/MobileNav) needs to switch to `getNavItemsForRole(user)` for students. Controller should integrate.
2. **`reload()` drops `isProfileComplete`/`profilePhoto`** (`AuthContext.tsx:27` builds a subset user). Plan said "reload: unchanged" so I left it; consequence: after the wizard saves and calls `reload()`, `user.isProfileComplete` is not refreshed from `/auth/me`, so a nav item keyed off `isProfileComplete === false` keeps showing until next login. Recommend controller/sibling update `reload` to `setUser(me)`.
3. **Plan snippet bug (refreshPromise leak)** — addressed (see §3). Reviewer should confirm the `.finally()`-based cleanup is acceptable vs the verbatim snippet.
4. **Sibling in-flight edits**: during my work `MobileNav.tsx` had transient `TS18047 'user' possibly null` errors at typecheck; they disappeared before final run (sibling finished). `errors.ts`/`errors.test.ts` and `Avatar.tsx` were created by siblings mid-session and are green. `Avatar.test.tsx` present on disk but not run by vitest discovery.

---

## 8. Verification commands used (workdir `frontend`)

```
npx vitest run src/api/client.test.ts
npx vitest run src/api/client.test.ts src/api/auth.test.ts src/utils/errors.test.ts src/components/ui/Avatar.test.tsx
npm run typecheck
npm run build
npm run lint
npm test
```