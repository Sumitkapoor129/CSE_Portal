# Task 7 Brief: Student module

Full plan: `docs/superpowers/plans/2026-09-08-frontend-implementation.md` (lines 1554–1718)
Backend contract: `C:\Users\91983\Desktop\VibeCoded\CSE_portal\src\routes\studentRoutes.ts` + `backend.md` (Student section)
Design spec: `docs/superpowers/specs/2026-09-08-frontend-design.md` (Student pages section)

IMPORTANT REPO RULES:
- This repo has NO git. Do NOT run any git commands. Skip the plan's commit step.
- Work from repo root `C:\Users\91983\Desktop\VibeCoded\CSE_portal`. All code under `frontend/`.
- NEVER add code comments. No emoji. Professional/minimal/classy. No gradients/glows. Only `animate-pulse` allowed (+ minimal `transition-colors`).
- Full literal Tailwind class strings only.
- Run npm commands with workdir `frontend` (PowerShell — chain with `; if ($?) { ... }`).

## Existing modules to reuse (exact names)
- `frontend/src/api/client.ts` → `apiFetch<T>(path, { method, body, query })`.
- `frontend/src/hooks/useApi.ts` → `useApi<T>(fetcher, deps?)` returns `{ data, loading, error, refetch }`.
- `frontend/src/context/AuthContext.tsx` → `useAuth()` → `{ user, ... }`; role guard `if (user?.role !== 'student') return <Navigate to="/" replace />`.
- `frontend/src/types/index.ts` → `StudentProfileView`, `Semester`, `Course`, `StudentCourse`, `Credits`, `CreditsSummary`, `CreditsListResponse`, `DocumentView`, `Form`, `Thesis`, `EventView`, `Deadline`, `Notification`, `Milestone`, `TimelineItem`. ADD `StudentDashboardData` (below).
- `frontend/src/utils/formatDate.ts` → `formatDate`, `formatDateTime`, `daysUntil`.
- `frontend/src/utils/constants.ts` → `STUDENT_TYPE_LABELS`, `MILESTONE_STATUS_STYLE`, `APPROVAL_STATUS_STYLE`, `THESIS_STATUS_STYLE`, `EVENT_TYPE_LABELS`.
- UI: `Card`, `Button`, `Input`, `Select`, `Tabs`, `Table` (+`TableRow`,`TableCell`,`TableEmpty`), `Badge`, `Modal`, `Skeleton` (+`SkeletonTable`,`SkeletonCards`), `Alert`, `EmptyState`, `PageHeader`. Shared: `frontend/src/components/shared/PageHeader.tsx`.

## Uniform page pattern (apply to EVERY page)
1. Role guard: `const { user } = useAuth(); if (user?.role !== 'student') return <Navigate to="/" replace />;`
2. `PageHeader` with title (+ description + optional actions).
3. Data via `useApi`: `loading` → `<SkeletonTable />`/`<SkeletonCards />`; `error` → `<Alert variant="error">` + `<Button onClick={refetch}>Try again</Button>`; empty → `<EmptyState title message action? />`.
4. Wrap in `Card` for tables/lists; use the existing primitives.

## Step 1 — `frontend/src/api/student.ts`
```ts
import { apiFetch } from './client';
import type { Course, Credits, CreditsListResponse, Deadline, DocumentView, EventView, Form, Milestone, Notification, Semester, StudentCourse, StudentProfileView, Thesis, TimelineItem } from '../types';

export const studentApi = {
  getDashboard: () => apiFetch<StudentDashboardData>('/student/dashboard'),
  getProfile: () => apiFetch<StudentProfileView>('/student/profile'),
  updateProfile: (payload: { name?: string; researchArea?: string; profilePhoto?: string }) =>
    apiFetch<StudentProfileView>('/student/profile', { method: 'PUT', body: payload }),
  getSemesters: () => apiFetch<Semester[]>('/student/semesters'),
  createSemester: (payload: { semesterNumber: number; academicYear: string; startDate: string; endDate: string }) =>
    apiFetch<Semester>('/student/semesters', { method: 'POST', body: payload }),
  getCourses: (semesterId: string) => apiFetch<Course[]>(`/student/semesters/${semesterId}/courses`),
  addCourse: (semesterId: string, payload: { courseCode: string; courseName: string; credits: number }) =>
    apiFetch<Course>(`/student/semesters/${semesterId}/courses`, { method: 'POST', body: payload }),
  getCredits: (semesterId?: string) =>
    apiFetch<CreditsListResponse | Credits>(semesterId ? '/student/credits' : '/student/credits', semesterId ? { query: { semesterId } } : undefined),
  getDocuments: () => apiFetch<DocumentView[]>('/student/documents'),
  uploadDocument: (payload: { documentName: string; documentType: string; fileUrl: string; semester?: string }) =>
    apiFetch<DocumentView>('/student/documents', { method: 'POST', body: payload }),
  getTheses: () => apiFetch<Thesis[]>('/student/thesis'),
  submitThesis: (payload: { title: string; documentUrl: string }) =>
    apiFetch<Thesis>('/student/thesis', { method: 'POST', body: payload }),
  getTimeline: () => apiFetch<TimelineItem[]>('/student/timeline'),
  getMilestones: () => apiFetch<Milestone[]>('/student/milestones'),
  getEvents: (upcoming?: boolean) =>
    apiFetch<EventView[]>(upcoming ? '/student/events' : '/student/events', upcoming ? { query: { upcoming } } : undefined),
  getDeadlines: (upcoming?: boolean) =>
    apiFetch<Deadline[]>(upcoming ? '/student/deadlines' : '/student/deadlines', upcoming ? { query: { upcoming } } : undefined),
  getForms: () => apiFetch<Form[]>('/student/forms'),
  getNotifications: () => apiFetch<Notification[]>('/student/notifications'),
  markNotificationRead: (id: string) =>
    apiFetch<Notification>(`/student/notifications/${id}/read`, { method: 'PUT' }),
};
```
NOTE: `getEvents`/`getDeadlines` use `{ query: { upcoming } }` — apiFetch already skips `undefined`/`''` params, so `upcoming` must be passed as a BOOLEAN request value; for the "All" view simply call without args. Simplify: make the signature `(upcoming?: boolean)` and build the options object conditionally (call without `upcoming` for all). If the query `?upcoming=true` is wrong per backend, drop the param and fetch all (check `src/routes/studentRoutes.ts` controller query handling and match it — the plan intends `?upcoming=true`).

## Step 1b — Add to `frontend/src/types/index.ts`
```ts
export interface StudentDashboardData {
  profile: StudentProfileView;
  currentSemester: Semester | null;
  credits: CreditsSummary;
  milestones: Milestone[];
  nextMilestone: Milestone | null;
  upcomingDeadlines: Deadline[];
  upcomingEvents: EventView[];
  pendingCourseRequests: StudentCourse[];
  thesis: Thesis | null;
  unreadNotifications: number;
}
```

## Step 2 — Pages

### StudentDashboard.tsx
Single `studentApi.getDashboard()` request. `useApi(studentApi.getDashboard)`.
- Stat row `grid gap-4 sm:grid-cols-2 lg:grid-cols-4` of 4 Cards: **Credits** (`credits.earned` / `credits.required`, small `remaining`), **Milestones** (`completedCount/11` where `status === 'completed'`), **Upcoming Deadlines** (count), **Unread Notifications** (count, as `Link` to `/student/notifications`).
- Next milestone banner Card (title + description + status `Badge`).
- Milestones progress: restrained horizontal bar — `h-2 rounded bg-gray-200` with inner fill `bg-blue-600` width `${completed/11*100}%`, plus small caption "N of 11 milestones completed", and `ButtonLink to="/student/milestones"` "View all". NO animated/gaudy stepper.
- Grid `grid gap-6 lg:grid-cols-2`: Upcoming Deadlines (Table: Title | Due date via `formatDate` | Days left via `daysUntil` red text "Overdue" when <0) and Upcoming Events (rows: title, `formatDate(date)`, type `Badge`).
- Below: Pending Course Requests table (course name/code/credits) only when non-empty; Thesis status Card (`THESIS_STATUS_STYLE` badge).

### StudentProfile.tsx
`getProfile()`. Definition list (label muted `text-xs font-medium uppercase tracking-wide text-gray-500`, value `text-sm text-gray-900`): name, email, collegeId, rollNumber, `STUDENT_TYPE_LABELS[studentType]`, department, researchArea, admissionDate (`formatDate`), requiredCredits, Supervisors (supervisor?.designation + name or "Not assigned", coSupervisor similarly). Edit modal (name, researchArea, profilePhoto) → `updateProfile` → on success close + `refetch()`. SRC committee Card when `srcCommittee` present: list members `faculty` name + role badge (`chairperson`/`supervisor`/`co_supervisor`/`member` labels).

### StudentMilestones.tsx
`Tabs` ["milestones" Checklist | "timeline" Degree Timeline]. Checklist: `getMilestones()`; vertical list of 11 — order number, title, `Badge` (MILESTONE_STATUS_STYLE), due date (`formatDate`), completed date. Read-only. Timeline tab: `getTimeline()`; `type === 'semester'` → semester header Card (semesterNumber, academicYear, start–end); `type === 'course'` → row (courseCode, courseName, credits, status badge).

### StudentCourses.tsx
`getSemesters()` once; `Select` (or `Tabs`) to pick active semester → `getCourses(semesterId)`. "Add Semester" modal (semesterNumber number, academicYear, startDate, endDate) → `createSemester` → refetch semesters. "Request Course" modal (courseCode, courseName, credits) → `addCourse(semesterId, ...)` → refetch courses. Courses table: code, name, credits, status badge, supervisor comment when present.

### StudentCredits.tsx
`getCredits()` → interpret response: if `data` has `semesters` array → `CreditsListResponse` (rows: `semesters[]` each has semesterNumber/year via semester object, `earnedCredits`); else single `Credits`. Show table (Semester / Academic Year / Earned Credits), total earned, required (from profile `requiredCredits`), remaining (`required - earned`). Optional semester `Select` filter that refetches with `semesterId` if you implement it — keep to aggregate view to stay simple unless a filter is trivial.

### StudentThesis.tsx
`getTheses()` → table of versions: Version, Title, Status badge (`THESIS_STATUS_STYLE`), Submission date (`formatDate`), supervisor comments (muted block when present). "Submit Thesis" modal (title, documentUrl) → `submitThesis` → refetch.

### StudentEvents.tsx
`Tabs` Upcoming | All → `studentApi.getEvents(true)` / `getEvents()`. Table/cards: Title, Type (`EVENT_TYPE_LABELS` badge), Date (`formatDate`), Location, Organizer name (resolve organizer name: if string show it, else `organizer.name`).

### StudentDeadlines.tsx
Same Upcoming | All toggle → `getDeadlines(true)`/`getDeadlines()`. Table: Title, Description, Due date (`formatDate`), Days remaining (`daysUntil`).

### StudentDocuments.tsx
`Tabs` "Documents" | "Forms". Documents: `getDocuments()` table — Name, Type (`formatDate(uploadDate)`), Status badge (APPROVAL_STATUS_STYLE), "Open" `<a href={fileUrl} target="_blank" rel="noreferrer">Open</a>`. "Upload Document" modal (documentName, documentType, fileUrl, semester optional) → `uploadDocument` → refetch. Forms: `getForms()` table — formName, formType, "Open form" link `target="_blank"`.

### StudentNotifications.tsx
`getNotifications()`. Heading shows unread count. Rows: title, message, `formatDateTime(createdAt)`, unread rows `bg-blue-50`; click → `markNotificationRead(id)` then navigate to `link` if present. No bulk mark-all (no backend endpoint).

## Step 3 — Wire routes in `App.tsx`
Inside the existing protected wrapper `<Route element={<><ProtectedRoute /><DashboardLayout /></>}>`, add:
```tsx
<Route path="/student" element={<ProtectedRoute roles={['student']} />}>
  <Route index element={<StudentDashboard />} />
  <Route path="profile" element={<StudentProfile />} />
  <Route path="milestones" element={<StudentMilestones />} />
  <Route path="courses" element={<StudentCourses />} />
  <Route path="credits" element={<StudentCredits />} />
  <Route path="thesis" element={<StudentThesis />} />
  <Route path="events" element={<StudentEvents />} />
  <Route path="deadlines" element={<StudentDeadlines />} />
  <Route path="documents" element={<StudentDocuments />} />
  <Route path="notifications" element={<StudentNotifications />} />
</Route>
```
Import all ten pages at top of App.tsx.

## Steps
1. Implement `student.ts` + `StudentDashboardData`.
2. Implement the 10 pages.
3. Wire routes.
4. Run (workdir `frontend`, in order): `npm run lint`, `npm run typecheck`, `npm run build`, `npm test` (all existing tests must still pass — these pages have no new tests).
5. Write report to `C:\Users\91983\Desktop\VibeCoded\CSE_portal\.superpowers\sdd\frontend-implementation\reports\task-7-report.md`.

## Report back
1. Files created (paths).
2. Confirm all 10 pages wired in App.tsx under the protected student route; dashboard uses exactly one `getDashboard()` request; no mark-all-bulk hack added.
3. Verification output (lint/typecheck/build/test).
4. Any deviations with reasons.