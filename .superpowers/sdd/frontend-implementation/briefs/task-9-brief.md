# Task 9 Brief: Admin module

Full plan: `docs/superpowers/plans/2026-09-08-frontend-implementation.md` (lines 1849–1975)
Backend contract (VERIFY shapes): `C:\Users\91983\Desktop\VibeCoded\CSE_portal\src\routes\adminRoutes.ts` + `C:\Users\91983\Desktop\VibeCoded\CSE_portal\src\controllers\adminController.ts`
Design spec: `docs/superpowers/specs/2026-09-08-frontend-design.md` (Admin pages section)

IMPORTANT REPO RULES:
- This repo has NO git. Do NOT run any git commands. Skip the plan's commit step.
- Work from repo root `C:\Users\91983\Desktop\VibeCoded\CSE_portal`. All code under `frontend/`.
- NEVER add code comments. No emoji. Professional/minimal/classy. No gradients/glows. Only `animate-pulse` (+ minimal `transition-colors`).
- Full literal Tailwind class strings only.
- Run npm commands with workdir `frontend` (PowerShell — chain with `; if ($?) { ... }`).

## CRITICAL id semantics (verify against adminController.ts + adminRoutes.ts)
- `PUT /admin/students/:id` and `PUT /admin/faculty/:id` use the **Profile** `_id`.
- `PUT /admin/students/:id/toggle-active` and `PUT /admin/faculty/:id/toggle-active` use the **User** `_id` (`item.user._id`).
- List responses populate `user`, so use `user._id` for toggles and top-level `_id` for edits.
- Admin `createEvent` does NOT accept a `semester` field (supervisor's does) — do NOT send it in the admin payload.
- `?create=1` on `/admin/students` should pre-open the Add Student modal.
- NO `window.confirm` — destructive actions confirm via `Modal`.

## Reuse (exact names)
- `apiFetch` (`api/client.ts`), `useApi` (`hooks/useApi.ts`), `useAuth`, `useNavigate`, `Link`, `useSearchParams`.
- Types already present: `StudentProfileView`, `UserShort`, `AuthUser`, `SRCMemberRole`, `SRCMember`, `Pagination`, `EventView`, `EventType`, `Form`, `Deadline`, `StudentType`. Add the new ones below.
- `formatDate`, `formatDateTime`, `daysUntil`; `STUDENT_TYPE_LABELS`, `EVENT_TYPE_LABELS`, `APPROVAL_STATUS_STYLE`, `MILESTONE_STATUS_STYLE`.
- UI: `Card`, `Button`, `ButtonLink`, `Input`, `Select`, `Tabs`, `Table`(+Row/Cell/Empty), `Badge`, `Modal`, `Skeleton`(+Table/Cards), `Alert`, `EmptyState`, `PageHeader`, `Pagination`.

## Step 1 — Add types to `frontend/src/types/index.ts`
```ts
export interface AdminDashboardData {
  totalStudents: number;
  totalFaculty: number;
  totalEvents: number;
  pendingApprovals: number;
}

export interface AdminCreateStudent {
  email: string;
  password: string;
  name: string;
  collegeId: string;
  rollNumber: string;
  studentType: StudentType;
  department: string;
  researchArea?: string;
  admissionDate?: string;
  requiredCredits?: number;
}

export interface AdminCreateFaculty {
  email: string;
  password: string;
  name: string;
  employeeId: string;
  department: string;
  designation: string;
  researchAreas?: string[];
}

export interface FacultyView {
  _id: string;
  user: UserShort;
  employeeId: string;
  department: string;
  designation: string;
  researchAreas: string[];
  profilePhoto?: string;
}

export interface AdminEventPayload {
  title: string;
  eventType: EventType;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  participants: string[];
  deadline?: string;   // NO semester (admin createEvent doesn't accept it)
}

export interface FormFields {
  formName: string;
  formType: string;
  fileUrl: string;
  semesterApplicable?: number[];
  studentTypeApplicable?: StudentType[];
  department?: string;
}

export interface DeadlineFields {
  title: string;
  description?: string;
  dueDate: string;
  semester?: string;
  student?: string;
}
```

## Step 2 — `frontend/src/api/admin.ts`
```ts
import { apiFetch } from './client';
import type {
  AdminCreateFaculty, AdminCreateStudent, AdminDashboardData, AdminEventPayload, AuthUser,
  Deadline, DeadlineFields, EventView, FacultyView, Form, FormFields, Pagination, SRCMemberRole, StudentProfileView,
} from '../types';

export const adminApi = {
  getDashboard: () => apiFetch<AdminDashboardData>('/admin/dashboard'),
  listStudents: (params: { search?: string; studentType?: string; department?: string; page?: number; limit?: number } = {}) =>
    apiFetch<{ students: StudentProfileView[]; pagination: Pagination }>('/admin/students', { query: params }),
  createStudent: (payload: AdminCreateStudent) =>
    apiFetch<{ user: AuthUser; profile: StudentProfileView }>('/admin/students', { method: 'POST', body: payload }),
  updateStudent: (id: string, payload: Record<string, unknown>) =>
    apiFetch<StudentProfileView>(`/admin/students/${id}`, { method: 'PUT', body: payload }),
  toggleStudentActive: (userId: string) =>
    apiFetch<{ id: string; isActive: boolean }>(`/admin/students/${userId}/toggle-active`, { method: 'PUT' }),
  listFaculty: (params: { search?: string; department?: string; page?: number; limit?: number } = {}) =>
    apiFetch<{ faculty: FacultyView[]; pagination: Pagination }>('/admin/faculty', { query: params }),
  createFaculty: (payload: AdminCreateFaculty) =>
    apiFetch<{ user: AuthUser; profile: FacultyView }>('/admin/faculty', { method: 'POST', body: payload }),
  updateFaculty: (id: string, payload: Record<string, unknown>) =>
    apiFetch<FacultyView>(`/admin/faculty/${id}`, { method: 'PUT', body: payload }),
  toggleFacultyActive: (userId: string) =>
    apiFetch<{ id: string; isActive: boolean }>(`/admin/faculty/${userId}/toggle-active`, { method: 'PUT' }),
  assignSupervisor: (payload: { studentId: string; supervisorId: string; coSupervisorId?: string }) =>
    apiFetch<unknown>('/admin/supervisor/assign', { method: 'POST', body: payload }),
  createSRCCommittee: (payload: { studentId: string; members: { faculty: string; role: SRCMemberRole }[] }) =>
    apiFetch<unknown>('/admin/src-committee', { method: 'POST', body: payload }),
  updateSRCCommittee: (id: string, members: { faculty: string; role: SRCMemberRole }[]) =>
    apiFetch<unknown>(`/admin/src-committee/${id}`, { method: 'PUT', body: { members } }),
  listEvents: (params: { page?: number; limit?: number } = {}) =>
    apiFetch<{ events: EventView[]; pagination: Pagination }>('/admin/events', { query: params }),
  createEvent: (payload: AdminEventPayload) =>
    apiFetch<EventView>('/admin/events', { method: 'POST', body: payload }),
  updateEvent: (id: string, payload: Record<string, unknown>) =>
    apiFetch<EventView>(`/admin/events/${id}`, { method: 'PUT', body: payload }),
  deleteEvent: (id: string) => apiFetch<{ message: string }>(`/admin/events/${id}`, { method: 'DELETE' }),
  listForms: (params: { page?: number; limit?: number } = {}) =>
    apiFetch<{ forms: Form[]; pagination: Pagination }>('/admin/forms', { query: params }),
  createForm: (payload: FormFields) => apiFetch<Form>('/admin/forms', { method: 'POST', body: payload }),
  updateForm: (id: string, payload: Record<string, unknown>) =>
    apiFetch<Form>(`/admin/forms/${id}`, { method: 'PUT', body: payload }),
  deleteForm: (id: string) => apiFetch<{ message: string }>(`/admin/forms/${id}`, { method: 'DELETE' }),
  listDeadlines: (params: { page?: number; limit?: number } = {}) =>
    apiFetch<{ deadlines: Deadline[]; pagination: Pagination }>('/admin/deadlines', { query: params }),
  createDeadline: (payload: DeadlineFields) =>
    apiFetch<Deadline>('/admin/deadlines', { method: 'POST', body: payload }),
  globalSearch: (q: string) =>
    apiFetch<{ students: unknown[]; faculty: unknown[] }>('/admin/search', { query: { q } }),
};
```
VERIFY each against adminController.ts — parameter names, body keys (e.g. updateSRCCommittee body shape `{ members }` vs flat), and toggle response. Adapt + report any differences.

## Step 3 — Pages (all `frontend/src/pages/admin/`, admin role guard on EVERY page: `if (user?.role !== 'admin') return <Navigate to="/" replace />`)

### AdminDashboard.tsx
`getDashboard()` → 4 stat Cards (`totalStudents`, `totalFaculty`, `totalEvents`, `pendingApprovals`). Quick actions: `ButtonLink` Create Student → `/admin/students?create=1`, Create Faculty → `/admin/faculty?create=1`, Create Event → `/admin/events`, Create Deadline → `/admin/deadlines`. Loading skeleton; error Alert+retry.

### StudentManagement.tsx
Debounced search + filters (studentType `Select`, department text) + `Pagination` (params: search, studentType, department, page, limit: 10). Table: Name (`user.name`), Roll Number, College ID, Type badge (`STUDENT_TYPE_LABELS`), Status (`user.isActive` → Badge green "Active" / gray "Inactive"), Actions: Edit (modal) + Activate/Deactivate (via modal confirm then `toggleStudentActive(user._id)`). Add Student (pre-opened when `?create=1` via `useSearchParams`): fields per `AdminCreateStudent`; `requiredCredits` number with hint "20 for direct-admission PhD; defaults to 12"; `admissionDate` type="date"; `researchArea` optional. Edit modal: name, email, collegeId, rollNumber, studentType, department, researchArea, profilePhoto → `updateStudent(profileId, ...)`.

### FacultyManagement.tsx
Mirror of students. Search + department filter + pagination. Table: Name (`user.name`), Employee ID, Department, Designation, Status, Actions (Edit/Activate-Deactivate modal confirm). Create/Edit per `AdminCreateFaculty` (researchAreas optional comma-separated text → array).

### SupervisorAssignment.tsx
Loads students (`listStudents({ limit: 100 })`; if backend pagination caps lower, add a client search filter) and faculty (`listFaculty({ limit: 100 })`). Three selects: Student, Supervisor, Co-Supervisor (optional). Submit → `assignSupervisor`. Hint text: replacing an existing assignment.

### SrcCommitteeManagement.tsx
Student select (search/`listStudents`). On selection, fetch student profile committee if you can via `listStudents` search match else select→GET `/admin/students/:id`… NO — simpler allowed: selecting a student shows create form. If a committee exists for a loaded student (available from the student list's `srcCommittee` when populated — check controller; otherwise just always show the Create form). Form: dynamic rows of `{ faculty Select, role Select }` (roles: chairperson | supervisor | co_supervisor | member). Client-side validation: exactly ONE chairperson. Submit → `createSRCCommittee({ studentId, members })`. If the backend update endpoint is needed you can expose Edit mode when you have committee id — only if trivially available; otherwise implement create-only + note it.

### FormManagement.tsx
`listForms({ limit: 10 })` + pagination. Table: formName, formType, semesterApplicable (comma list or "—"), studentTypeApplicable (labels), Actions: Edit / Delete (modal confirm → `deleteForm`). Create/Edit modal per `FormFields`; `semesterApplicable` as comma-separated numbers text → number[]; `studentTypeApplicable` as multi checkboxes of frp/erp.

### DeadlineManagement.tsx
`listDeadlines({ limit: 10 })` + pagination. Table: title, description, dueDate (`formatDate`), scope badge ("Global" when no student+semester; "Semester" or "Student" otherwise), days remaining. Create modal per `DeadlineFields`: title, description, dueDate (date), semester (optional), student (optional selects from `listStudents`/`listFaculty` — keep semester/student as simple text/select-optional; blank = global).

### EventManagement.tsx
`listEvents({ limit: 10 })` + pagination. Table: title, type badge (`EVENT_TYPE_LABELS`), date (`formatDate`), location, participant count (`participants?.length`). Create/Edit modal: title, eventType `Select`, description, date (date), startTime/endTime (time), location, participants multi-select — options from `listStudents({ limit: 100 })`, values = profile `_id`. NO semester field. Delete via modal confirm.

### GlobalSearch.tsx
Input + submit button (or submit-on-Enter form). `globalSearch(q)` → two result Cards: Students (name, roll, collegeId, email) and Faculty (name, employeeId, email). Rows link to `/admin/students` or `/admin/faculty`. Handle `unknown[]` defensively (render known fields when present).

## Step 4 — Wire routes in `App.tsx`
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

## Steps
1. Verify controller/route shapes, add types, create `admin.ts`.
2. Implement 9 pages.
3. Wire routes.
4. Run (workdir `frontend`, in order): `npm run lint`, `npm run typecheck`, `npm run build`, `npm test` (all pass; existing 19 tests).
5. Write report to `C:\Users\91983\Desktop\VibeCoded\CSE_portal\.superpowers\sdd\frontend-implementation\reports\task-9-report.md`.

## Report back
1. Files created (paths).
2. Controller verification: toggle-active user-id semantics, update profile-id semantics, SRC update body shape, search response fields, createEvent no-semester confirmation.
3. Route wiring + guard confirmation on all 9 pages.
4. Verification output (lint/typecheck/build/test).
5. Any deviations with reasons.