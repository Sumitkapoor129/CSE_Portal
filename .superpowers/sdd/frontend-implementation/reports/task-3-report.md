# Task 3 Report: Auth state, generic `useApi` hook, and route guard

Status: COMPLETE. TDD followed (RED then GREEN). All verification commands pass.

## 1. Files created

- `frontend/src/api/auth.ts` — `authApi` (login, register, verifyOtp, me, changePassword)
- `frontend/src/hooks/useApi.ts` — generic `useApi<T>` (data/loading/error/refetch)
- `frontend/src/hooks/useAuth.ts` — re-export of `useAuth` from AuthContext
- `frontend/src/context/AuthContext.tsx` — `AuthProvider` + `useAuth`; listens for `auth:unauthorized` CustomEvent and clears user
- `frontend/src/components/shared/ProtectedRoute.tsx` — inline loading fallback, `Navigate` on no-user/role mismatch
- `frontend/src/api/auth.test.ts` — tests (2)
- `frontend/src/hooks/useApi.test.ts` — tests (3)

Dependency installed: `@testing-library/react@^16` (dev). `jsdom@^25` was already present.

Reused existing modules (not duplicated): `apiFetch` from `frontend/src/api/client.ts`, `AuthUser`/`UserRole` types from `frontend/src/types`.

## 2. RED then GREEN proof

RED (`npm test`, before implementation):
- `FAIL src/api/auth.test.ts` — `Error: Cannot find module './auth'` (and `Failed to load url ./auth ... Does the file exist?`)
- `FAIL src/hooks/useApi.test.ts` — `Error: Failed to resolve import "./useApi" from "src/hooks/useApi.test.ts". Does the file exist?`
- Result: 2 failed suites, 14 passed / 14 tests (existing suite untouched and green).

GREEN (`npm test`, after implementation):
- 6 test files passed, 19/19 tests passed (setup 1 + validators 4 + formatDate 5 + client 4 + auth 2 + useApi 3), matches the brief's expected total of 19.

## 3. Anticipated fix applied: jsdom pragma on `auth.test.ts`

Applied `// @vitest-environment jsdom` at the top of `frontend/src/api/auth.test.ts`.

Motivating failure text (node environment after modules resolved):
- `ReferenceError: window is not defined` at `apiFetch src/api/client.ts:44:44` (`new URL(... window.location.origin)`)
- `ReferenceError: localStorage is not defined` at `clearStoredToken src/api/client.ts:21:3`

No assertion was changed. This was the minimal, consistent fix per brief rule 1.

Note: `useApi.test.ts` already included the jsdom pragma from the brief. The `IS_REACT_ACT_ENVIRONMENT` flag was NOT needed — no React `act(...)` environment warnings or errors appeared in any run, so it was not applied (brief rule 3: only if needed).

## 4. Verification summary

- `npm test`: PASS — 6 files, 19/19 tests.
- `npm run lint`: PASS (exit 0) — 0 errors. One warning remains: `react-hooks/exhaustive-deps` at `src/hooks/useApi.ts:36:13` (spread element in dependency array). This is inherent to the brief's exact-specified implementation of `useApi`; it is a warning only and does not fail the pipeline, so the specified code was kept verbatim.
- `npm run typecheck`: PASS — `tsc -b --noEmit`, no output (clean).
- `npm run build`: PASS (exit 0) — `tsc -b && vite build`, built `dist/` successfully (29 modules, index JS 194.77 kB / gzip 60.95 kB).

## 5. Other deviations

- Removed `setStoredToken` from the imports in `frontend/src/api/auth.test.ts`. Reason: it was imported but never used in the brief's test content, which failed `npm run lint` (`@typescript-eslint/no-unused-vars` error) and `npm run typecheck` (`TS6133`). Minimal causal fix: remove the unused import. No assertions were changed and no tsconfig/lint strictness was weakened.
- First implementation run produced 2 test failures (window/localStorage) plus additional unused-import failures from lint/typecheck; all resolved causally as above (no assertion or source changes beyond the brief's exact contents).

## 6. Git

Confirmed: no git commands were run (this repo intentionally has no git).