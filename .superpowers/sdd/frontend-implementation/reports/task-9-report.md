# Task 9 Report: Admin module

Date: 2026-09-09

## 1. Files created

- `frontend/src/api/admin.ts`
- `frontend/src/pages/admin/AdminDashboard.tsx`
- `frontend/src/pages/admin/StudentManagement.tsx`
- `frontend/src/pages/admin/FacultyManagement.tsx`
- `frontend/src/pages/admin/SupervisorAssignment.tsx`
- `frontend/src/pages/admin/SrcCommitteeManagement.tsx`
- `frontend/src/pages/admin/FormManagement.tsx`
- `frontend/src/pages/admin/DeadlineManagement.tsx`
- `frontend/src/pages/admin/EventManagement.tsx`
- `frontend/src/pages/admin/GlobalSearch.tsx`

Files modified:
- `frontend/src/types/index.ts` — added 7 new interfaces (AdminDashboardData, AdminCreateStudent, AdminCreateFaculty, FacultyView, AdminEventPayload, FormFields, DeadlineFields).
- `frontend/src/App.tsx` — wired 9 admin routes.

## 2. Controller verification results (vs `src/controllers/adminController.ts` + `src/routes/adminRoutes.ts`)

1. **toggle-active uses USER id — CONFIRMED.** `toggleStudentActive`/`toggleFacultyActive` call `User.findById(id)` and validate role. Both list endpoints populate `user` (`paginate(..., ['user'])`), so the client uses `item.user._id` for toggles.
2. **update uses PROFILE id — CONFIRMED.** `updateStudent`/`updateFaculty` call `StudentProfile.findById(id)`/`FacultyProfile.findById(id)`. The client sends the item's top-level `_id` (profile id) for updates.
3. **SRC committee update body shape — CONFIRMED.** `updateSRCCommittee` destructures `{ members }` from `req.body`; client body is `{ members }`.
4. **globalSearch response fields — CONFIRMED.** Returns `{ students, faculty }`. Each array mixes full populated profile docs (matched via collegeId/rollNumber/employeeId) and `{ user }`-only docs (matched via user name). Client treats both as `unknown[]` and reads known fields defensively.
5. **admin createEvent rejects semester — CONFIRMED.** `createEvent` destructures `{ title, eventType, description, date, startTime, endTime, location, participants, deadline }` and never reads/saves a `semester`. The admin payload omits `semester`.

Client adaptations from the brief:
- Brief lists "8 new interfaces"; only 7 are specified. All 7 were added.
- `listStudents`/`listFaculty` response wrappers match the brief exactly: `{ students, pagination }` and `{ faculty, pagination }`; backend caps list `limit` at 100.
- GlobalSearch renders each row from profile fields when present, falling back to `user` fields for name/email.
- Event edit pre-fills date via `formatDate` and times via a local `toTimeValue` helper (list response stores Date/Time as ISO date strings). Participant pre-selection maps event participant user-ids → student profile-ids using the loaded student list; unmatched ids are not pre-selected.

## 3. Route wiring + guard confirmation

Added inside the `DashboardLayout` fragment:

```tsx
<Route path="/admin" element={<ProtectedRoute roles={['admin']} />}>
  <Route index element={<AdminDashboard />} />
  <Route path="students" element={<StudentManagement />} />
  <Route path="faculty" element={<FacultyManagement />} />
  <Route path="assignments" element={<SupervisorAssignment />} />
  <Route path="src-committees" element={<SrcCommitteeManagement />} />
  <Route path="forms" element={<FormManagement />} />
  <Route path="deadlines" element={<DeadlineManagement />} />
  <Route path="events" element={<EventManagement />} />
  <Route path="search" element={<GlobalSearch />} />
</Route>
```

All 9 pages additionally begin every page with `if (user?.role !== 'admin') return <Navigate to="/" replace />;` set after all hooks. Generator was verified: `frontend/src/components/layout/navConfig.ts` already defines the admin nav (Dashboard, Students, Faculty, Assignments, SRC Committees, Forms, Deadlines, Events, Search).

## 4. Verification output

All run from `frontend/` in order:

- `npm run lint` — PASS (0 errors; 1 pre-existing warning in `src/hooks/useApi.ts` dependency-spread warning, present before this task).
- `npm run typecheck` — PASS (`tsc -b --noEmit` clean).
- `npm run build` — PASS (93 modules, dist JS 358.78 kB / gzip 97.91 kB).
- `npm test` — PASS (6 files, 19 tests).

## 5. Deviations and notes

- **SRC committee page is create-only** (no edit mode). Admin `listStudents` populates only `['user']` — `srcCommittee` is not populated — and there is no admin GET endpoint for a single student's committee id/members, so an edit mode isn't trivially available. The page shows the create form for the selected student; if a committee already exists the backend's 409 message is surfaced in the form (`updateSRCCommittee` remains defined in `api/admin.ts` per the brief's contract).
- **`?create=1` support**: implemented on both StudentManagement and FacultyManagement (dashboard links) via `useState(() => searchParams.get('create') === '1')` — no effect needed, so no re-open loop after closing the modal.
- **No client search filter on option pickers** (SupervisorAssignment, SrcCommitteeManagement, DeadlineManagement, EventManagement participants): the brief said add one only if the backend caps below 100; the backend's cap is exactly 100 (`Math.min(100, ...)`), so `limit: 100` is used directly.
- **Destructive actions** use Modal-based confirmation (Student/Faculty deactivate, Form/Event delete); no `window.confirm` anywhere.
- No git commands were run (repo has no git).