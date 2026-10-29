# Project Context — CSE PhD Scholar Management Portal (CSE_portal)

> **Session-Handoff Document**  
> *Read this first in any new session to restore full architectural, operational, and development context.*

---

## 1. System Mission & Department Context

The **CSE PhD Scholar Management Portal** is a centralized, role-based academic governance platform developed for the Department of **Computer Science & Engineering (CSE)** at the **National Institute of Technology (NIT) Jamshedpur**.

The system addresses the end-to-end PhD lifecycle, transitioning manual paperwork into automated, auditable workflows adhering to the **NIT Jamshedpur PhD Regulations 2024**:
- **PhD Scholars:** Self-service portal for onboarding, dynamic semester course registration, real-time credit tracking, statutory milestone checklist progression, thesis draft submissions, document repository, and calendar/deadline alerts.
- **Supervisors & Co-Supervisors:** Oversight dashboard for assigned research scholars, course registration approvals, multi-version thesis reviews, event scheduling (seminars, viva-voce) with multi-participant resolution, and milestone completion signing.
- **Department Administration:** System-wide governance including faculty and scholar provisioning, supervisor assignments, Student Research Committee (SRC) constitution and compliance validation, deadline management with automated 6-hour email scheduler, institutional form publishing, and high-throughput bulk import via Excel.

---

## 2. Live Operational State & Environment

The full stack operates as a monorepo with concurrent execution managed from the workspace root:

| Component | Status | Port / URL | Notes |
|---|---|---|---|
| **Root Monorepo** | Active | `npm start` (`concurrently`) | Spawns backend and frontend dev processes concurrently |
| **Backend Server** | Active | `http://localhost:5000` | Express + TypeScript (`ts-node-dev`), mounts `/api` |
| **Frontend Client** | Active | `http://localhost:5173` | React 19 + Vite 6 + Tailwind v4, proxies `/api` to `:5000` |
| **Database** | Connected | MongoDB Atlas | Cluster connected via `MONGODB_URI` in `backend/.env` |
| **Email Service** | Configured | Gmail SMTP (587) | `nodemailer` transport active; falls back to logging if disconnected |

### Environment Configuration (`backend/.env`)
- `PORT=5000`
- `NODE_ENV=development`
- `MONGODB_URI`: Active MongoDB Atlas connection string
- `JWT_SECRET`: `NIT_JAMSHEDPUR` (Access token TTL: `15m`, Refresh token TTL: `7d`)
- `CORS_ORIGINS`: `http://localhost:5173`
- `SMTP_HOST`: `smtp.gmail.com`, `SMTP_PORT`: `587`, `SMTP_USER` & `SMTP_PASS` active
- `OTP_EXPIRY_MINUTES`: `10`
- `ADMIN_EMAIL`: `admin@college.edu`, `ADMIN_PASSWORD`: `admin123`

---

## 3. Monorepo Structure & Key Paths

```text
CSE_portal/
├── AGENTS.md                  → Project instructions, subagent workflows, git rules
├── Requirement.txt            → Full Software Requirements Specification (SRS)
├── document.md                → System architecture & SRS-to-code mapping
├── context.md                 → (This file) Operational handoff & technical state
├── backend.md                 → API route specification and request/response shapes
├── package.json               → Monorepo scripts (concurrently dev/build/test/typecheck)
├── backend/
│   ├── .env                   → Live environment configuration
│   ├── package.json           → Express dependencies (Mongoose 8, Bcrypt, Multer, XLSX)
│   └── src/
│       ├── app.ts             → Express boot, scheduler launch, rate-limit, helmet
│       ├── controllers/       → auth, student, supervisor, admin, bulkImport
│       ├── models/            → 20 Mongoose models (User, StudentProfile, Milestone, etc.)
│       ├── routes/            → authRoutes, studentRoutes, supervisorRoutes, adminRoutes
│       ├── services/          → milestoneService, creditService, deadlineService
│       ├── utils/             → email, notify, audit, otp, participants, pagination
│       └── __tests__/         → Jest test suites (in-memory MongoDB)
└── frontend/
    ├── package.json           → React 19, Vite 6, Tailwind CSS v4, React Router 6
    ├── vite.config.ts         → API proxy configuration
    └── src/
        ├── App.tsx            → Router root, role-based ProtectedRoute, lazy pages
        ├── api/               → client.ts (silent refresh), auth, student, supervisor, admin
        ├── context/           → AuthContext.tsx (user session, token storage)
        ├── pages/             → auth (3), student (11), supervisor (5), admin (10)
        ├── components/        → layout/, shared/, ui/ (accessible primitives)
        └── __tests__/         → Vitest test suites
```

---

## 4. Critical Developer Commands

All commands are runnable from the monorepo root:

| Command | Action | Verification / Output |
|---|---|---|
| `npm start` or `npm run dev` | Boots both Backend (:5000) and Frontend (:5173) | Both logs interleaved via `concurrently` |
| `npm run typecheck` | Compiles TypeScript in `backend/` and `frontend/` | `tsc --noEmit` on both workspaces |
| `npm run build` | Builds backend to `dist/` and frontend via `vite build` | Ready for production deployment |
| `npm test` | Runs backend Jest tests and frontend Vitest tests | Isolated tests using `mongodb-memory-server` |
| `npm --prefix backend run dev` | Runs backend only | `ts-node-dev --respawn --transpile-only src/app.ts` |
| `npm --prefix frontend run dev` | Runs frontend only | Vite dev server on `:5173` |

---

## 5. Domain Rules & Regulations Compliance

### 5.1 Scholar Classification
- **FRP (`frp`):** Full-time Research Program scholar. Required credits: **12** (post-Master's degree).
- **ERP (`erp`):** External / Part-time Research Program scholar. Direct B.Tech admission requires **20** credits.
- Credit computation is automated dynamically via `creditService.ts` from approved `StudentCourse` records and validated against `StudentProfile.requiredCredits`.

### 5.2 11-Stage Mandatory PhD Milestones (`MilestoneKey`)
Auto-seeded upon scholar account creation or registration via `services/milestoneService.ts`:
1. `admission` (0) — Admission & Enrollment
2. `src_formed` (1) — Formation of Student Research Committee (SRC)
3. `course_work` (2) — Course Work & Credit Requirements Fulfilled
4. `comprehensive_exam` (3) — Comprehensive Examination Cleared
5. `topic_registration` (4) — Research Topic Formulation & Registration
6. `enhancement_seminar` (5) — State-of-the-Art / Enhancement Seminar
7. `pre_submission` (6) — Pre-Submission Seminar
8. `thesis_submitted` (7) — Final Thesis Draft Submitted
9. `thesis_approved` (8) — Evaluation & External Board Approval
10. `defense` (9) — Oral Defence & Viva-Voce
11. `degree_awarded` (10) — Degree Conferred at Convocation

*Note: Milestones are tracked in `Milestone` collection with a unique compound index on `{ student, key }` to prevent duplicate seeding.*

### 5.3 Student Research Committee (SRC) Composition
Enforced during creation (`POST /api/admin/src-committee`) and updates (`PUT /api/admin/src-committee/:id`):
- **1 Chairperson:** Senior faculty member from CSE department.
- **1 Supervisor:** Must match the scholar's active supervisor assignment (`Supervisor` collection).
- **Optional Co-Supervisor:** Validated against assignment records.
- **Members:** At least two departmental faculty members and one external/allied faculty member.

---

## 6. Recent Evolution & Merged Pull Requests

The codebase incorporates significant recent additions and bug fixes:
- **PR #5 (`cb0d9db` - `fixed/added-milestones-approved-by-admin`):**
  - Added `GET /api/admin/students/:id/milestones` and `PUT /api/admin/milestones/:id`.
  - Added Milestone review modal to `StudentManagement.tsx` in frontend admin portal.
  - Aligned milestone status updates across supervisor and admin controllers.
- **PR #4 (`8abb301` - `fixed/bugs`):**
  - Fixed SRC Committee formation validations and error reporting.
  - Upgraded `utils/participants.ts` to seamlessly resolve mixed User and StudentProfile IDs for event notifications.
  - Refined course approval state transitions in `studentController.ts` and `supervisorController.ts`.
- **PR #3 (`56926d0` - `fixed/bugs` & `4588c75 Added Email Notification`):**
  - Integrated `nodemailer` transport using Gmail SMTP.
  - Added automated email delivery for OTP verification, event invitations, and deadline alerts.
- **PR #2 (`6191498` - `feature/profile-and-bugfixes` & `a058f92 Added Bulk Import`):**
  - Created `controllers/bulkImportController.ts` with multi-format spreadsheet ingestion (CSV, XLS, XLSX) using `xlsx` and `multer`.
  - Added template generators (`/api/admin/bulk-import/template/:type`) for students, faculty, and events.
  - Built frontend `BulkImport.tsx` with drag-and-drop file upload, real-time import summary, and row-level error reporting.
- **PR #1 (`93ffc7b` - `feature/debug-and-optimize`):**
  - Monorepo folder reorganization into separate `backend/` and `frontend/` roots.
  - Added `RefreshToken` entity and automatic silent access token renewal in `api/client.ts`.

---

## 7. Frontend Architecture Highlights

- **Framework:** React 19 + Vite 6 + Tailwind CSS v4.
- **Zero Third-Party UI Bloat:** Fully custom accessible UI library in `frontend/src/components/ui/` (`Button`, `Table`, `Modal`, `Tabs`, `Pagination`, `Badge`, `Alert`, `Skeleton`).
- **Accessible Focus Management:** `ConfirmModal` and modals utilize custom focus traps with `onCloseRef` dependency guards (preventing loss of typing focus in text inputs).
- **Silent JWT Refresh:** `api/client.ts` intercepts HTTP 401 responses, initiates a single in-flight `/api/auth/refresh` request, updates `localStorage`, and retries the original request seamlessly.
- **Role Routing Guard:** `ProtectedRoute` wraps nested sub-routes using `<Outlet />`, guaranteeing that layout chrome and child views render properly without blank area swallowing.
- **Page Inventory (29 Total):**
  - *Auth (3):* Login, Register, VerifyOtp.
  - *Student (11):* Dashboard, Profile, Milestones, Courses, Credits, Thesis, Events, Deadlines, Documents, Notifications, CompleteProfile (Onboarding).
  - *Supervisor (5):* Dashboard, StudentList, StudentDetail, Approvals, Events.
  - *Admin (10):* Dashboard, StudentManagement (with Milestone modal), FacultyManagement, SupervisorAssignment, SrcCommitteeManagement, FormManagement, DeadlineManagement, EventManagement, BulkImport, GlobalSearch.
  - *Fallback (1):* NotFoundPage.

---

## 8. Pre-Seeded Test Credentials

| Role | Email | Password | Details |
|---|---|---|---|
| **System Admin** | `admin@college.edu` | `admin123` | Auto-seeded at boot from `.env` |
| **Faculty 1** | `sup1@example.edu` | `Scholar@123` | Dr. Anita Sharma (CSE) — Supervisor |
| **Faculty 2** | `sup2@example.edu` | `Scholar@123` | Dr. Rakesh Verma (CSE) — Supervisor |
| **Faculty 3** | `sup3@example.edu` | `Scholar@123` | Dr. Meera Iyer (CSE) — Faculty / Committee |
| **Faculty 4** | `sup4@example.edu` | `Scholar@123` | Dr. K. Subramanian (CSE) — Faculty / Committee |
| **Scholar 1** | `scholar1@example.edu` | `Scholar@123` | Aarav Gupta (FRP, Roll: 22CSP001) |
| **Scholar 2** | `scholar2@example.edu` | `Scholar@123` | Sneha Patil (FRP, Roll: 22CSP002) |
| **Scholar 3** | `scholar3@example.edu` | `Scholar@123` | Rahul Kumar (ERP, Roll: 22CSP003) |

---

## 9. Known Gotchas & Architectural Traps

1. **MongoDB Atlas DNS / Network Heartbeat:**
   If local network connection is interrupted, the MongoDB Node driver will throw a `MongoServerSelectionError` on replica set discovery. The server stays alive and automatically reconnects once network connectivity stabilizes.
2. **Dashboard Counts vs List Counts:**
   `adminController.getDashboard` calculates counts from the base `User` collection, whereas list views query `StudentProfile` and `FacultyProfile`. Orphan `User` documents from early manual tests may lead to slight count variance.
3. **Supervisor Route Ordering:**
   In `backend/src/routes/supervisorRoutes.ts`, `router.get('/students/options', ...)` must strictly be declared **before** `router.get('/students/:studentId', ...)`; otherwise Express pattern matching swallows `options` as a student ID.
4. **Modal Focus Trap Typing:**
   The accessible modal focus trap in `ConfirmModal` and edit dialogs uses `[open]` in its `useEffect` dependency array rather than an inline `onClose` callback to avoid re-binding and stealing focus while a user types in form fields.
5. **Accepted Lint Warning:**
   In `frontend/src/hooks/useApi.ts:36`, spreading the dependency array inside `useCallback` emits a known React Hooks warning that is accepted as by-design for generic fetcher hooks.

---

## 10. Candidate Next Steps

1. **Production Docker Deployment:**
   Create a multi-stage `Dockerfile` and `docker-compose.yml` to package backend and frontend behind an NGINX reverse proxy.
2. **Automated Seed Migration Script:**
   Convert the one-off database seed script into an idempotent `npm run seed` command within `backend/src/utils/seedData.ts`.
3. **Cloud Object Storage Adapter:**
   Replace the current simulated file storage URLs with an active AWS S3 / Cloudinary SDK adapter for uploaded marksheets and thesis PDFs.
4. **Continuous Integration Pipeline:**
   Configure GitHub Actions workflow to run `npm run typecheck` and `npm test` on all feature branches and pull requests.
