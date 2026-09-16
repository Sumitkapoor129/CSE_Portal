# FE Beta Report — Tasks 7, 8, 9 (F1/F2 PasswordInput + errors, F5 identity/dropdown, F6 Avatar)

Agent: fe-beta · Date: 2026-09-16 · Branch work left uncommitted (controller commits).

## Task 7 — F1/F2 PasswordInput + auth error surfacing

**Implemented**
- Created `frontend/src/utils/errors.test.ts` (plan verbatim) — TDD file for `errorFields`/`errorMessage`/`applyServerError`.
- Created `frontend/src/utils/errors.ts` (plan verbatim). `setFieldErrors` is typed `(fields: Record<string, string>) => void` and is satisfied by the pages' `Dispatch<SetStateAction<FieldErrors>>` (all target props optional) — no type gymnastics needed.
- Created `frontend/src/components/ui/PasswordInput.tsx` (plan verbatim): same props API as `Input` (`id`, `label`, `error`, `hint`) + visibility eye toggle with `aria-label` "Show password"/"Hide password", `aria-invalid`, `aria-describedby="{id}-error"/"{id}-hint"`, `role="alert"` error paragraph, `cn` from `../../utils/cn`.
- `LoginPage.tsx`: password `Input` → `PasswordInput`; submit `catch (err)` now calls `applyServerError(err, setFieldErrors, setServerError)` (surfaces server field errors + server message).
- `RegisterPage.tsx`: same two changes (password field also has the "At least 8 characters." hint preserved).
- `VerifyOtpPage.tsx`: submit `catch (err)` → `applyServerError(err, setFieldErrors, setServerError)`.
- `Header.tsx` change-password modal: three password `Input`s → `PasswordInput`; `catch (err)` → `applyServerError(err, setFieldErrors, setPwError)`. Removed now-unused `Input` import. (Task 8/9 Header changes also in this file, see below.)

**TDD evidence — errors.test.ts**
- RED: `npx vitest run src/utils/errors.test.ts` → `Error: Cannot find module './errors'` (Failed Suites 1, 0 tests) — before errors.ts existed.
- GREEN: `npx vitest run src/utils/errors.test.ts` → `2 passed (2)` `Test Files 1 passed`.
- Note: this test depends on the sibling's `ApiError.fields` 3rd constructor arg in `client.ts`. It landed mid-session (confirmed in `client.ts` now: `fields?: Record<string,string>`); first re-run after creating errors.ts passed immediately.

## Task 8 — F6 Avatar + photo everywhere, F5 sidebar/mobile identity

**Implemented**
- Created `frontend/src/components/ui/Avatar.tsx` (plan verbatim): `Avatar({ name, photo?, size?: 'sm'|'md'|'lg', className? })`; `<img>` when photo present (decorative `alt=""`), initials fallback (`initials(name) || '?'`), sizes `sm h-8 w-8`, `md h-9 w-9`, `lg h-16 w-16`.
- Created `frontend/src/components/ui/Avatar.test.tsx` (adapted, see self-review).
- `Header.tsx`: replaced initials div with `<Avatar name={user.name} photo={user.profilePhoto ?? null} size="sm" />`; removed the now-unused `initials` computation.
- `Sidebar.tsx`: identity block swapped (Avatar md + user name + `ROLE_LABELS[user.role]`), removed duplicate role line and "CSE/PhD Scholar Portal/NIT Jamshedpur" brand.
- `MobileNav.tsx`: same identity swap in the mobile panel header; removed duplicate role line; identity block wrapped in `{user && ...}` for null-safety (panel only ever renders authenticated users via ProtectedRoute).
- `StudentProfile.tsx`: added header row inside profile Card — `<Avatar name={data.user.name} photo={data.profilePhoto ?? null} size="lg" />` + name/email; URL edit field untouched.
- `StudentDetail.tsx`: `<Avatar name={data.profile.user.name} photo={data.profile.profilePhoto ?? null} />` next to the student name in the header Card.
- `StudentManagement.tsx`: added avatar cell (sm) as first table column (`key: 'photo', header: ''`), updated `TableEmpty colSpan` 6→7.
- `FacultyManagement.tsx`: same avatar column (sm); `TableEmpty colSpan` 6→7.

**TDD evidence — Avatar.test.tsx**
- RED: `npx vitest run src/components/ui/Avatar.test.tsx` → "No test files found" (the repo `vite.config.ts` `test.include` is `['src/**/*.test.ts']`, so `.test.tsx` is not discovered). A further RED was caught when Forcing discovery via a transient config: `getByRole('img')` failed because the plan-verbatim `alt=""` makes the img role "presentation".
- GREEN: proven via a transient `vitest.avatar.config.ts` (`include: ['src/**/*.test.{ts,tsx}']`, deleted immediately after) → `2 passed (2)`.

## Task 9 — F5 responsive header dropdown

- `Header.tsx`: dropdown container class → `absolute right-0 top-full mt-2 max-w-[calc(100vw-2rem)] w-56 rounded-lg border border-gray-200 bg-white p-1 shadow-lg outline-none`. Trigger (Avatar) already visible on all sizes (name hidden below `sm`); container is `relative`, header has `px-4`, no overflow-hidden ancestor clips the menu (verified DashboardLayout).

## Verification (workdir `frontend`)

- `npx vitest run src/utils/errors.test.ts` → **PASS** (2/2).
- `npx vitest run src/components/ui/Avatar.test.tsx` → cannot discover `.tsx` under default config (see Concern C1; content proven GREEN with transient config).
- `npm run typecheck` → **clean** (0 errors).
- `npm run build` → **PASS** (104 modules).
- `npm run lint` → **0 errors** (1 pre-existing warning in `src/hooks/useApi.ts:36` exhaustive-deps — not ours).

## Self-review findings

- The plan's verbatim Avatar test and verbatim Avatar component are mutually incompatible: `getByRole('img')` cannot find an `<img alt="">` (implicit role "presentation"), and jest-dom matchers (`toBeInTheDocument`, `toHaveAttribute`) are not installed (no `@testing-library/jest-dom` dependency; existing repo component tests use `toBeTruthy`/`getAttribute`). Adapted the test minimally while keeping its intent: `container.querySelector('img')?.getAttribute('src')` and `toBeTruthy` for the initials assertion. No production code changed from plan verbatim.
- `MobileNav` now null-guards the identity block (TS strict was failing on `user` before).
- Admin tables: colSpan updated to 7 after inserting the avatar column (avoids empty-state layout bug).
- Removed dead code created by the swaps (`initials` in Header, unused `Input` import).
- No emoji, no new deps, TS strict respected.

## Concerns

- **C1 (gate command)**: `npx vitest run src/components/ui/Avatar.test.tsx` cannot discover `.tsx` files because `frontend/vite.config.ts` sets `test.include: ['src/**/*.test.ts']`. `vite.config.ts` is NOT in my owned-file list, so I did not modify it. To make the documented gate pass as-written, extend `include` to `['src/**/*.test.{ts,tsx}']` (or the controller may prefer renaming tests to `.test.ts`). Avatar.test.tsx content itself passes (2/2) when discovery is enabled.
- **C2 (transient in-flight)**: one typecheck run mid-session showed 4 errors in the sibling's `AuthContext.tsx` (refresh-token work); resolved by the sibling — final typecheck is clean. `ApiError.fields` dependency for errors.test.ts also landed mid-session (now present in client.ts).
- No commits made (controller commits).

## Files changed (mine only)

New: `frontend/src/components/ui/PasswordInput.tsx`, `frontend/src/utils/errors.ts`, `frontend/src/utils/errors.test.ts`, `frontend/src/components/ui/Avatar.tsx`, `frontend/src/components/ui/Avatar.test.tsx`.
Modified: `frontend/src/pages/auth/LoginPage.tsx`, `frontend/src/pages/auth/RegisterPage.tsx`, `frontend/src/pages/auth/VerifyOtpPage.tsx`, `frontend/src/components/layout/Header.tsx`, `frontend/src/components/layout/Sidebar.tsx`, `frontend/src/components/layout/MobileNav.tsx`, `frontend/src/pages/student/StudentProfile.tsx`, `frontend/src/pages/supervisor/StudentDetail.tsx`, `frontend/src/pages/admin/StudentManagement.tsx`, `frontend/src/pages/admin/FacultyManagement.tsx`.

Untouched (per instructions): `client.ts`, `client.test.ts`, `api/auth.ts`, `api/student.ts`, `AuthContext.tsx`, `App.tsx`, `types/index.ts`, `navConfig.ts`, `StudentOnboarding.tsx`, `StudentCourses/StudentThesis/StudentDashboard`, all backend, `vite.config.ts`.