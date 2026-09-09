# Task 8 Brief: Supervisor module

Full plan: `docs/superpowers/plans/2026-09-08-frontend-implementation.md` (lines 1721–1846)
Backend contract (VERIFY shapes): `C:\Users\91983\Desktop\VibeCoded\CSE_portal\src\routes\supervisorRoutes.ts` + `C:\Users\91983\Desktop\VibeCoded\CSE_portal\src\controllers\supervisorController.ts`
Design spec: `docs/superpowers/specs/2026-09-08-frontend-design.md` (Supervisor pages section)

IMPORTANT REPO RULES:
- This repo has NO git. Do NOT run any git commands. Skip the plan's commit step.
- Work from repo root `C:\Users\91983\Desktop\VibeCoded\CSE_portal`. All code under `frontend/`.
- NEVER add code comments. No emoji. Professional/minimal/classy. No gradients/glows. Only `animate-pulse` (+ minimal `transition-colors`).
- Full literal Tailwind class strings only.
- Run npm commands with workdir `frontend` (PowerShell — chain with `; if ($?) { ... }`).

## Reuse (exact names)
- `apiFetch` (`api/client.ts`), `useApi` (`hooks/useApi.ts`), `useAuth`, `useNavigate`, `Link`/`NavLink`.
- Types already in `frontend/src/types/index.ts`: `StudentProfileView`, `StudentOption`, `Semester`, `StudentCourse`, `DocumentView`, `Thesis`, `EventView`, `SRCCommittee`, `Credits`, `CreditsSummary`, `Pagination`, `PendingApprovals`, `ApprovalRequestView`, `EventType`.
- `formatDate`, `formatDateTime`, `daysUntil`; `STUDENT_TYPE_LABELS`, `EVENT_TYPE_LABELS`, `APPROVAL_STATUS_STYLE`, `THESIS_STATUS_STYLE`.
- UI primitives (all exist): `Card`, `Button`, `ButtonLink`, `Input`, `Select`, `Tabs`, `Table`(+`TableRow`,`TableCell`,`TableEmpty`), `Badge`, `Modal`, `Skeleton`(+`SkeletonTable`,`SkeletonCards`), `Alert`, `EmptyState`, `PageHeader`.

## About the upcoming-query and pagination (VERIFY against code)
The supervisor student list controller paginates WITHOUT `limit` in the pagination object (it returns `{ data?: pagination items, total, page, totalPages }` — confirm by reading `getMyStudents` in `supervisorController.ts`). The events GET also returns paginated events. Match the client's return `{ events, pagination }`/`{ students, pagination }` to the REAL controller responses and adapt if the shape differs (report any mismatch). Also confirm how `participants` are echoed back for events (string ids vs objects) and adapt the event table's participant-count cell accordingly.

## Step 1 — Add types to `frontend/src/types/index.ts`
```ts
export interface StudentListItem extends StudentProfileView {}

export interface SupervisorDashboardData {
  assignedStudents: number;
  pendingApprovals: number;
  upcomingEvents: number;
  pendingCourseApprovals: number;
  pendingThesisApprovals: number;
  pendingGeneralApprovals: number;
}

export interface SupervisorStudentDetail {
  profile: StudentProfileView;
  semesters: Semester[];
  courses: StudentCourse[];
  documents: DocumentView[];
  theses: Thesis[];
  srcCommittee: SRCCommittee | null;
  timeline: { semester: Semester; courses: StudentCourse[]; credits: Credits | null }[];
  totalCredits: CreditsSummary;
}

export interface SupervisorEventPayload {
  title: string;
  eventType: EventType;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  participants: string[];
  semester?: string;
  deadline?: string;
}
```

## Step 2 — `frontend/src/api/supervisor.ts`
```ts
import { apiFetch } from './client';
import type { EventView, Pagination, PendingApprovals, StudentListItem, StudentOption, SupervisorDashboardData, SupervisorEventPayload, SupervisorStudentDetail } from '../types';

export const supervisorApi = {
  getDashboard: () => apiFetch<SupervisorDashboardData>('/supervisor/dashboard'),
  getStudents: (params: { name?: string; rollNumber?: string; semester?: string; studentType?: string; researchArea?: string; page?: number; limit?: number } = {}) =>
    apiFetch<{ students: StudentListItem[]; pagination: Pagination }>('/supervisor/students', { query: params }),
  getStudentOptions: () => apiFetch<StudentOption[]>('/supervisor/students/options'),
  getStudentDetail: (studentId: string) => apiFetch<SupervisorStudentDetail>(`/supervisor/students/${studentId}`),
  approveCourse: (studentCourseId: string, payload: { status: 'approved' | 'rejected'; comment?: string }) =>
    apiFetch<unknown>(`/supervisor/courses/${studentCourseId}/approve`, { method: 'PUT', body: payload }),
  approveThesis: (thesisId: string, payload: { status: 'approved' | 'rejected' | 'resubmission_required'; comment?: string }) =>
    apiFetch<unknown>(`/supervisor/thesis/${thesisId}/approve`, { method: 'PUT', body: payload }),
  approveRequest: (requestId: string, payload: { status: 'approved' | 'rejected'; comment?: string }) =>
    apiFetch<unknown>(`/supervisor/approvals/${requestId}/approve`, { method: 'PUT', body: payload }),
  getPendingApprovals: () => apiFetch<PendingApprovals>('/supervisor/approvals/pending'),
  createEvent: (payload: SupervisorEventPayload) =>
    apiFetch<EventView>('/supervisor/events', { method: 'POST', body: payload }),
  getEvents: (params: { page?: number; limit?: number; eventType?: string } = {}) =>
    apiFetch<{ events: EventView[]; pagination: Pagination }>('/supervisor/events', { query: params }),
};
```
Adjust to match the controllers' real shapes if they differ (e.g., dashboard keys, students/pagination wrapper). REPORT any change.

## Step 3 — Pages (all under `frontend/src/pages/supervisor/`)

Uniform page pattern (every page): `const { user } = useAuth(); if (user?.role !== 'supervisor') return <Navigate to="/" replace />;` then `PageHeader`, `useApi` 3-state (skeleton / error Alert + retry / EmptyState).

### SupervisorDashboard.tsx
`getDashboard()` → 6 stat Cards in `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`: Assigned Students (link to `/supervisor/students`), Pending Approvals (link to `/supervisor/approvals`), Upcoming Events (link to `/supervisor/events`), plus Pending Course Approvals / Pending Thesis Approvals / Pending General Approvals (sub-broken, plain numbers). Keys per the REAL controller — adapt from `SupervisorDashboardData` if needed. Link cards with `ButtonLink`/`Link`.

### StudentList.tsx
Side filter panel (Container: `space-y-4`, a Card at top or left on `lg`): Name search (debounced 300ms via `useEffect`+`setTimeout`), Roll Number (text), Semester (text or number), Student Type (`Select` with `''|frp|erp`), Research Area (text). Below: `Table` columns Name (`student.user.name`), Roll Number (`rollNumber`), Department, Student Type badge (`STUDENT_TYPE_LABELS`), Research Area. Row click → `useNavigate()(`/supervisor/students/${row._id}`)`. `Pagination` bound to page + `pagination.totalPages` → refetch. Clear filters button.

### StudentDetail.tsx
`useParams().studentId` → `getStudentDetail(id)`. Header Card: name (`profile.user.name`), rollNumber, studentType `Badge`. `Tabs`:
- **Profile**: definition list (collegeId, department, researchArea, admissionDate `formatDate`, requiredCredits, supervisor/coSupervisor names or "Not assigned").
- **Academics**: iterate `timeline` — each `Card` with semester header (semesterNumber, academicYear) + its courses Table (code, name, credits, status badge) + credits summary block.
- **Documents**: read-only docs Table (name, type, uploadDate, status badge, Open link).
- **Thesis**: theses Table (Version, Title, Status badge, submission date). For rows with `status === 'submitted' || status === 'under_review'`, action buttons Approve / Reject / Request Resubmission → open a shared decision `Modal` (comment textarea) → `approveThesis` with corresponding status → success `Alert` + refetch.
- **SRC**: `srcCommittee` members (faculty name + role label) else `EmptyState`.

### Approvals.tsx
`getPendingApprovals()` → 3 sections (Course / Thesis / General). Each row: student name (resolve from nested objects — `requester`/`student` can be string or object; show what's available), item details, Approve/Reject buttons → decision `Modal` (comment) → `approveCourse`/`approveThesis`/`approveRequest` with proper status → refetch + success `Alert`. If all 3 lists empty → `EmptyState title="No pending approvals"`.

### SupervisorEvents.tsx
`getEvents()` via useApi with `{ page, limit: 10 }`. Table: Title, Type (`EVENT_TYPE_LABELS` badge), Date (`formatDate`), Location, Participants (count). Pagination. "Create Event" `Modal`: fields per `SupervisorEventPayload` (title, eventType `Select`, description, date `type="date"`, startTime/endTime `type="time"`, location, semester optional, deadline optional date, participants multi-select). Participants options fetched with `getStudentOptions()` only when modal opens. Submit → `createEvent` → close modal, refetch, success `Alert`. NOTE: supervisor createEvent ACCEPTS `semester`; admin's does not (that note is for Task 9).

## Step 4 — Wire routes in `App.tsx`
Inside the protected wrapper, add:
```tsx
<Route path="/supervisor" element={<ProtectedRoute roles={['supervisor']} />}>
  <Route index element={<SupervisorDashboard />} />
  <Route path="students" element={<StudentList />} />
  <Route path="students/:studentId" element={<StudentDetail />} />
  <Route path="approvals" element={<Approvals />} />
  <Route path="events" element={<SupervisorEvents />} />
</Route>
```

## Steps
1. Verify controller shapes, add types, create `supervisor.ts`.
2. Implement 5 pages.
3. Wire routes.
4. Run (workdir `frontend`, in order): `npm run lint`, `npm run typecheck`, `npm run build`, `npm test` (all existing tests must pass).
5. Write report to `C:\Users\91983\Desktop\VibeCoded\CSE_portal\.superpowers\sdd\frontend-implementation\reports\task-8-report.md`.

## Report back
1. Files created (paths).
2. Controller-shape verification results (dashboard keys, students pagination wrapper, events participants shape) and any client adaptions.
3. Routes wired confirmation; guard on every page.
4. Verification output (lint/typecheck/build/test).
5. Any deviations with reasons.