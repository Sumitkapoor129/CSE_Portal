# Task 7 Report: Student module

## Files created

- `frontend/src/api/student.ts` — student API client (17 methods).
- `frontend/src/pages/student/StudentDashboard.tsx`
- `frontend/src/pages/student/StudentProfile.tsx`
- `frontend/src/pages/student/StudentMilestones.tsx`
- `frontend/src/pages/student/StudentCourses.tsx`
- `frontend/src/pages/student/StudentCredits.tsx`
- `frontend/src/pages/student/StudentThesis.tsx`
- `frontend/src/pages/student/StudentEvents.tsx`
- `frontend/src/pages/student/StudentDeadlines.tsx`
- `frontend/src/pages/student/StudentDocuments.tsx`
- `frontend/src/pages/student/StudentNotifications.tsx`
- `frontend/src/components/student/DueDateCell.tsx` (shared helper for deadline "days left / overdue" rendering)

## Files modified

- `frontend/src/types/index.ts` — added `StudentDashboardData` interface.
- `frontend/src/App.tsx` — wired all 10 student routes.

## Confirmation

- All 10 student pages wired in `App.tsx` inside the protected wrapper (`ProtectedRoute` + `DashboardLayout`), nested under `<Route path="/student" element={<ProtectedRoute roles={['student']} />}>`.
- Dashboard makes exactly ONE API request: `useApi(studentApi.getDashboard)` — no per-section fetches.
- Role guard present on every page (`if (user?.role !== 'student') return <Navigate to="/" replace />`).
- Every page uses the 3-state pattern: loading skeleton / error Alert + retry / empty state.
- No bulk "mark all read" endpoint/button added (backend has none).

## Backend validation for credits/events/deadlines

- `getCredits` (studentController.ts:186): no query param → returns `{ semesters: Credits[], totalEarnedCredits }` (`CreditsListResponse`); with `?semesterId` → returns a single `Credits` doc. The client `getCredits(semesterId?)` matches; the Credits page uses the aggregate (`CreditsListResponse`) view with `semesterId` unused.
- `getMyEvents` (studentController.ts:465): parses `req.query.upcoming === 'true'` (strict string). Client passes `{ query: { upcoming: true } }` which serializes to `?upcoming=true` — matches.
- `getMyDeadlines` (studentController.ts:481): same strict `upcoming === 'true'` handling — matches.
- The client builds the options object conditionally (no `upcoming` param for "All" view) and passes a boolean for the "Upcoming" view, per the brief's note. No mismatch found.

## Verification

- `npm run lint`: 0 errors, 1 pre-existing warning (useApi.ts exhaustive-deps spread warning, not introduced here).
- `npm run typecheck`: passed.
- `npm run build`: passed (vite build, 76 modules, gzip 83.45 kB JS).
- `npm test`: 6 test files, 19 tests passed (no test regressions; no new tests added per brief).

## Deviations

- Added `frontend/src/components/student/DueDateCell.tsx` as a small shared component to avoid duplicating the "days left / overdue" rendering logic across the dashboard and deadlines pages. This is consistent with the project's reuse-first rule.
- `StudentDeadlines` shows the actual due date (`formatDate`) in a "Due Date" column and a separate "Days Remaining" column with the overdue/days-left rendering, rather than collapsing both into one.
- `StudentCredits` additionally fetches the profile and semesters to display required credits and semester academic years, exactly matching the brief's requirement (required credits comes from the profile). It does not add a semester filter (kept to the aggregate view per the brief).
- `StudentMilestones` fetches milestones and timeline once in the parent (noted, to avoid duplicate requests when toggling tabs).

## Notes

- No git commands were run (repo has no git by design).
