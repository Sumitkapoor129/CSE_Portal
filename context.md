# Project Context — CSE PhD Scholar Management Portal (CSE_portal)

> Session-handoff file. Read this first in any new session to restore full context.

## 1. Objective
Build a PhD Scholar Management System for NIT Jamshedpur's **CSE (Computer Science & Engineering)** department. It is a "one-place" portal:
- **Students** see their current status, milestones, deadlines, events, forms, and credits at a glance.
- **Faculty/Supervisors** manage assigned students, approve requests, create events.
- **Admin** manages students, faculty, events, SRC committees, forms, semesters, courses, milestones, deadlines — plus sends notifications/emails so deadlines aren't missed.

The system was implemented as a **backend** (Node.js + Express + TypeScript + MongoDB) plus a **complete React frontend** (`frontend/`), and is driven by an SRS (`document.md`) and validated against the NIT Jamshedpur PhD Regulations 2024 (`C:\Users\91983\Desktop\PhD_new.pdf`).

## 2. Tech Stack
- **Node.js + Express** (`express`)
- **TypeScript** (`src/`, build via `tsc`)
- **MongoDB + Mongoose 8** (`mongoose`)
- Auth: `jsonwebtoken` (JWT bearer), `bcryptjs` (hashing), OTP signup
- Email: `nodemailer` (SMTP if configured in `.env`, otherwise **logs** the email — never fails)
- Security: `helmet`, `cors`, `express-rate-limit` (100 req / 15 min on `/api`), `dotenv`
- Tests: **Jest + ts-jest + mongodb-memory-server + supertest** (`npm test`)

## 3. Critical Commands (run from repo root)
| Command | Purpose | Status |
|---|---|---|
| `npm run dev` | dev server (`ts-node-dev`) | Needs a running MongoDB — **MongoDB is NOT installed locally**; app hangs on connect timeout |
| `npm run build` | `tsc` compile → `dist/` | ✅ PASS |
| `npm run typecheck` | `tsc --noEmit` | ✅ PASS |
| `npm test` | Jest (uses in-memory MongoDB, no local mongo needed) | ✅ 3 suites / 15 tests PASS |
| `npm run lint` | ❌ **BROKEN** — no ESLint config exists; skip unless you add one | |

**Workflow rules (from `AGENTS.md`):** use `task` subagents aggressively (parallel), find/install skills before coding, run lint/typecheck/test after every change.

## 4. Core Enums & Types (in `src/types/index.ts`)
- `UserRole`: `student`, `supervisor`, `admin`
- `StudentType`: `FULL_TIME = 'frp'` (Full-time Research Program), `EXTERNAL = 'erp'` (External Research Program) — **renamed from** `regular`/`part_time`
- `ApprovalStatus`: `pending`, `approved`, `rejected`, `resubmission_required`
- `SRCMemberRole`: `chairperson`, `supervisor`, `co_supervisor`, `member`
- `MilestoneStatus`: `pending`, `in_progress`, `completed`, `skipped`
- `MilestoneKey` (order matters, 11 steps): `admission` (0) → `src_formed` (1) → `course_work` (2) → `comprehensive_exam` (3) → `topic_registration` (4) → `enhancement_seminar` (5) → `pre_submission` (6) → `thesis_submitted` (7) → `thesis_approved` (8) → `defense` (9) → `degree_awarded` (10)
- `IStudentProfile` now includes `requiredCredits: number` (default **12**; **20** for direct-admission PhD — admin sets it)

## 5. Architecture — Models (21 total, in `src/models/`)
User, StudentProfile, FacultyProfile, Semester, Course, StudentCourse, Credits, DocumentModel (Document), Form, Thesis, Supervisor, SRCCommittee, Event, Deadline, Notification, ApprovalRequest, AuditLog, OTP, Milestone.

Key field notes:
- **Event.participants**: subdocs `{ participant: ObjectId, participantModel }` — always `participantModel: 'User'` (ids resolved via `utils/participants.ts`)
- **Deadline**: `title, description, dueDate, semester?, student?, createdBy, notificationSent` — `notificationSent` guards idempotency of the scheduler; `{ student: null }` (missing) matches global deadlines
- **StudentProfile**: `user, collegeId, rollNumber, studentType (frp/erp), department, researchArea, admissionDate, requiredCredits, supervisor?, coSupervisor?, srcCommittee?, isProfileComplete`
- **Milestone**: `student, key, title, description, status, order, dueDate?, completedAt?, updatedBy?` — **unique index on `{ student, key }`**

## 6. Architecture — Services & Utils (`src/services/`, `src/utils/`)
- **`src/services/milestoneService.ts`**
  - `DEFAULT_MILESTONES`: the 11-step checklist (`MilestoneKey` order above)
  - `seedMilestones(studentId)` — inserts all 11 as `pending`; dedups via catch of Mongo code 11000 (no re-throw on duplicate key)
  - `getMilestones(studentId)` — sorted by `order`
  - `updateMilestone(milestoneId, updaterUserId, { status?, dueDate?, title?, description? })` — validates status against `MilestoneStatus`, sets `completedAt` when completed (clears otherwise), throws `'Milestone not found'` / `'Invalid status: ...'`
- **`src/services/creditService.ts`** — auto-computes credits (NOT hand-maintained):
  - `computeTotalCredits(studentId, requiredCredits)` → `{ earned, required, remaining }`
  - `computeCreditsForSemester(studentId, semesterId, requiredCredits)` → same shape
  - Both aggregate `StudentCourse` where `status: 'approved'`, `$lookup` into `Course` to sum `credits`
- **`src/services/deadlineService.ts`**
  - `checkDeadlines({ daysAhead = 7, log = false })` — finds `Deadline` where `notificationSent: false` and `dueDate` within window; scope resolution: explicit `student` → else `semester` membership → else global; creates Notification per user + email via `sendNotificationEmail`; sets `notificationSent = true`. **Never throws** (returns `{ error }` on failure so the scheduler loop survives). Returns `{ checked, notif, emails }`.
- **`src/utils/participants.ts`**
  - `resolveUserIds(ids)` — accepts a mix of User ids and StudentProfile ids → deduped User id list
  - `resolveParticipants(ids)` → `{ userIds, participantDocs: [{ participant, participantModel: 'User' }] }`
  - `getEligibleStudentOptions(supervisorUserId)` — students assigned to a supervisor via `Supervisor` (fields: `student`, `supervisor` ref FacultyProfile, `isActive`) → `{ userId, profileId, name, rollNumber, department, studentType }[]`
- Other existing utils: `notify.ts` (`createNotification`, `createBulkNotifications`), `email.ts` (`sendNotificationEmail` — SMTP-or-log), `audit.ts` (`createAuditLog`), `otp.ts`, `pagination.ts`, `response.ts`, `seedAdmin.ts`, middlewares `auth.ts` (JWT + RBAC `authenticate`/`authorize`), `errorHandler.ts` (`AppError`, `asyncHandler`).

## 7. API Surface (all prefixed per router)
| Router | Endpoints |
|---|---|
| `/api/auth` | register (student w/ OTP verify + auto-seeds milestones; admin), login, verify-OTP, me, forgot/reset password, change password |
| `/api/student` | dashboard, events, deadlines, forms, milestones (GET, `?upcoming=true`), credits, thesis CRUD, my supervisor, course requests, documents, notifications, SRC view |
| `/api/supervisor` | my students, **`GET /students/options`** (eligible picker — register BEFORE `/students/:studentId`), student detail (includes `totalCredits`), event create (participants resolved + emailed), event update/delete, approvals, SRC manage, **`PUT /milestones/:id`** (ownership-verified), thesis actions |
| `/api/admin` | students CRUD (create accepts `requiredCredits`; seeds milestones; frp/erp), faculty CRUD, assignments, events create (participants resolved + emailed), **`PUT /milestones/:id`**, SRC committee create/update (**validates exactly one chairperson; supervisor member must match assigned supervisor**), semesters, courses, forms, deadlines, approvals, dashboard stats |

## 8. Deadline Scheduler & Email Wiring
- Started in **`src/app.ts`** `start()` → `startDeadlineScheduler()`: runs `checkDeadlines({ daysAhead: 7, log: true })` immediately + `setInterval` every **6 hours** (`DEADLINE_CHECK_INTERVAL_MS`).
- Graceful shutdown on SIGINT/SIGTERM added.
- Emails go out on: deadline reminders (scheduler), event invitations (admin+supervisor `createEvent`), OTP signup. All via `sendNotificationEmail` (SMTP-or-log).

## 9. Documentation Files
- **`backend.md`** — all routes, request/response shapes, behavioral notes (participant resolution, SRC validation, scheduler, frp/erp, requiredCredits, auto-computed credits). **Updated to reflect latest work.**
- **`document.md`** — SRS feature (FR-xx) → implementation mapping + a `## Services` table. **Updated.**

## 10. Reference Material
- `C:\Users\91983\Desktop\PhD_new.pdf` — NIT Jamshedpur PhD Regulations 2024 (guidelines source).
- Extracted text: `C:\Users\91983\AppData\Local\Temp\opencode\phd_new.txt` (via pdftotext).
- Key regulatory rules encoded: SRC = chairperson + 2 dept members + 1 other-dept member + co-supervisor + supervisor; coursework 12 credits (post-Master) / 20 (direct) within 2 years; PhD journey milestone sequence as in `MilestoneKey`.

## 11. Known Constraints / Gotchas
- **MongoDB not installed locally** → `npm run dev` hangs on connect timeout. For integration testing use `npm test` (mongodb-memory-server). Running the server requires a real Mongo (local mongod or `MONGODB_URI` in `.env`).
- **`npm run lint` broken** (no ESLint config). Fix only if you add `eslint.config.*` + script.
- `node_modules` was **corrupt once** (picomatch missing) — fixed by deleting `node_modules` + `package-lock.json` then `npm install`. If odd module errors appear, same fix applies.
- `new Schema<IFooDocument>` pattern was replaced by `new Schema<any>` across all models to fix TS variance — keep that convention in new models.
- `AuthRequest` in `src/types/index.ts` extends `Request` from express (imported explicitly).
- Route-order trap: `/students/options` must be registered before `/students/:studentId`.

## 12. Recommended Next Steps (candidate backlog)
- ~~Frontend (React/Vite) consuming these APIs~~ → **DONE — see sections 13–17.**
- Production Mongo + real SMTP creds in `.env` (see `.env.example`).
- CI for `npm run test`; deploy (Dockerfile) with mongod service.
- Idempotent seed script in repo (current one is a one-off in the temp dir).
- Optional: 3rd near-identical admin CRUD page would trigger extraction of a config-driven table/CRUD presenter (rule of three — deliberately deferred).

---

## 13. Frontend — COMPLETE (React 19 + Vite + Tailwind v4)

- **Location:** `frontend/`. Stack: React 19, Vite 6, **TypeScript strict**, Tailwind v4 (`@tailwindcss/vite`, no config files), React Router v6 (`BrowserRouter`), Vitest 3, ESLint 9 flat config. **No UI/state libraries** — zero extra runtime deps beyond react/react-router.
- **Task execution:** 12-task plan (`docs/superpowers/plans/2026-09-08-frontend-implementation.md`) executed by subagents. **All 12 tasks DONE/APPROVED.** Ledger: `.superpowers/sdd/frontend-implementation/progress.md`; per-task briefs in `.../briefs/`, reports in `.../reports/`.
- **Pages:** auth (login, register, verify-otp), student ×10, supervisor ×5, admin ×9, NotFound. Auth pages eager; ALL other pages `React.lazy` (one chunk per page). Initial bundle **~79.3 kB gzip** (100 modules); Suspense fallback = `Skeleton`; `ErrorBoundary` wraps `Routes`.
- **API layer:** `frontend/src/api/{client,auth,student,supervisor,admin}.ts`. `apiFetch` → base `VITE_API_URL ?? '/api'`, unwraps `{success, data}`, Bearer token from `localStorage['cse_portal_token']`; 401 → clears token + dispatches `auth:unauthorized` event (never reloads). URL queries via `encodeURIComponent`.
- **Hooks/state:** `useApi(fetcher, deps)` (loading/error/data/refetch, latest-wins), `AuthContext` (token restore via `GET /auth/me`, role-based), `ProtectedRoute roles`.
- **Shared components:** `components/shared/` → `PageHeader, QueryError, StatCard, ConfirmModal, DetailRow, ParticipantPicker, ProtectedRoute, ErrorBoundary, LazyPage`(n/a); `components/ui/` → 13 primitives (Button/Input/Select/Card/Table/Badge/Modal/Tabs/Pagination/Skeleton/Alert/EmptyState); `components/layout/` → Sidebar/Header/MobileNav/DashboardLayout/NavList/navConfig (student 10, supervisor 4, admin 9 nav items); `components/student/DueDateCell`.
- **Accessibility done:** modal + mobile-nav focus trap & focus return, `aria-describedby` error association, skip link (`#main`), `role=status` skeletons, `scope=col`, contrast fixes. Modal focus trap uses `onCloseRef` + `[open]` deps (a dependency-array `onClose` bug that stole focus while typing was found in review and fixed).
- **Backend gaps (intentionally NOT built; do not invent):** no supervisor/admin milestone-read endpoint; no forgot/reset password UI; no admin semester/course management pages; uploads are pre-existing `fileUrl` strings; admin `createEvent` takes NO `semester`; supervisor pagination has no `limit` (only `page/total/totalPages`).
- **Quality gates passed:** aesthetic / performance / code-quality / accessibility reviewers (round 2 on changes) — all APPROVED. Lint clean except ONE accepted pre-existing warning (`useApi.ts:36` exhaustive-deps spread).

## 14. Running the stack (dev)

- Root `.env` (created today) → **Atlas URI**: `MONGODB_URI=mongodb+srv://admin:admin@cluster0.ugvytad.mongodb.net/cse_portal`; `JWT_SECRET` set; `SMTP_USER/PASS` empty → emails/OTPs **log to console**.
- **Backend** (`npm run dev` from repo root) on :5000 — `ts-node-dev --respawn`. Known cosmetic noise: `[ERROR] ... error TS5103: Invalid value for '--ignoreDeprecations'.` appears in logs at startup (ts-node-dev vs newer TS); server recovers/transpiles after the tsconfig touch and works.
- **Frontend** (`npm run dev` from `frontend/`) on :5173 — Vite proxy `/api` → `http://localhost:5000`.
- Open **http://localhost:5173**.

## 15. Seeded demo data (via admin API today)

- **Admin** (auto-seeded): `admin@college.edu` / `admin123`.
- **Faculty** (`sup1..sup4@example.edu` / `Scholar@123`): Dr. Anita Sharma, Dr. Rakesh Verma, Dr. Meera Iyer, Dr. K. Subramanian (all CSE).
- **Students** (`scholar1..scholar3@example.edu` / `Scholar@123`): Aarav Gupta, Sneha Patil, Rahul Kumar (frp/erp) — each with supervisor + co-supervisor assigned and an SRC committee (exactly one chairperson; supervisor member matches assigned supervisor).
- **Events:** Research Methodology Seminar (all 3 students), Comprehensive Examination (first 2). **Deadlines:** Course Work Completion (+45d), Provisional Topic Registration (+90d). **Forms:** Doctoral Committee Formation, Thesis Submission.
- Verified: dashboard `totalStudents 6, totalFaculty 4, totalEvents 2, pendingApprovals 0`. Seed script (one-off, non-idempotent — 409s on duplicates): `C:\Users\91983\AppData\Local\Temp\opencode\seed-cse-portal.js`.

## 16. Today's quirks/gotchas

- **Dashboard count ≠ list count** (backend metric quirk, not a bug): `getDashboard` counts **User** docs (`adminController.ts:27-30`); list endpoints count **Profile** docs. Post-seed: 6 student users vs 5 student profiles → there are pre-existing **orphan users** in the Atlas DB from earlier testing.
- **"Blank main area, sidebar only" for an ADMIN/STUDENT/SUPERVISOR account** was a REAL bug (fixed): `ProtectedRoute` returned `null` when authorized, and a React Router v6 route whose `element` renders `null` swallows its nested child routes (verified against `react-router.development.js` `_renderMatches`: `children = match.route.element` else `outlet`). So `/admin` (and `/student`, `/supervisor`) rendered `ProtectedRoute` → `null` → none of the page routes rendered, leaving only the `DashboardLayout` chrome. Fix: `ProtectedRoute` now renders `<Outlet />` when authorized, and `App.tsx` nests `DashboardLayout` under a pathless `<Route element={<ProtectedRoute />}>` guard. Regression test: `frontend/src/__tests__/protected-routes.test.ts`. (A hard refresh still helps for genuine HMR-disconnect dead tabs, but the blank-content app bug is fixed.)
- Port conflicts: if a stray backend holds :5000, kill it: `Get-NetTCPConnection -LocalPort 5000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`.
- Deleted dead code: `frontend/src/components/ui/Spinner.tsx`, `frontend/src/hooks/useAuth.ts`.

## 17. Start-over checklist (tomorrow)

1. Kill stray node on :5000 / :5173 (command above).
2. Ensure `node_modules` exists in repo root and `frontend/` (if corrupt/missing: delete + `npm install`).
3. `.env` present at repo root (Atlas URI + JWT secret + empty SMTP) — created today, keep it.
4. Backend: `npm run dev` (root) → wait for "Server running on port 5000".
5. Frontend: `cd frontend && npm run dev` → open http://localhost:5173.
6. Login `admin@college.edu` / `admin123` — dashboard cards show the seeded numbers (hard-refresh if blank).
7. Detail per task: read `.superpowers/sdd/frontend-implementation/briefs|reports/` + `progress.md`.
8. Frontend verification commands (in `frontend/`): `npm test` (19/19), `npm run typecheck`, `npm run build`, `npm run lint` (1 accepted warning).