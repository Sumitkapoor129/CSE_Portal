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

## 4. Academic Data Model & Enums

### User Roles & Classifications
- `UserRole`: `student`, `supervisor` (faculty), `admin`.
- `StudentType`: `frp` (Full-time Research Program), `erp` (External Research Program).
- `Program`: `phd` (default), `mtech`, `btech`, `mca`.
- `SRCMemberRole`: `chairperson` (locked to HOD), `supervisor`, `co_supervisor`, `member`, `external_member`.

### Statutory Milestones (11 Steps Ordered Checklist)
1. `admission`: Initial enrollment and profile initialization.
2. `src_formed`: Constitution of Student Research Committee.
3. `course_work`: Prescribed credit completion (minimum 12 credits for M-Tech entrants, 20 credits for Direct/B-Tech entrants).
4. `comprehensive_exam`: Written and oral examination clearance (maximum 2 attempts).
5. `topic_registration`: Formal research plan and proposal approval.
6. `enhancement_seminar`: Assessment for scholarship extension/continuation.
7. `pre_submission`: Pre-synopsis defense presentation before the department.
8. `thesis_submitted`: External review copy submission.
9. `thesis_approved`: Recommendation receipt from external examiners.
10. `defense`: Final public viva-voce and oral defense.
11. `degree_awarded`: Senate approval and formal convocation graduation.

---

## 5. Automated Background Tasks

### Deadlines & Email Reminder Daemon
- **File:** `backend/src/services/deadlineService.ts`
- **Execution Interval:** Scheduled every 6 hours via `node-cron`.
- **Logic:** Queries active deadlines within a 3-day notification window, checks idempotency via `notificationSent: false`, sends batch emails using `nodemailer`, creates internal notifications in the `Notification` collection, and marks `notificationSent: true`.

---

## 6. Recent Major Architecture & Feature Milestones

- **Bulk Import Engine (`5858f92 Added Bulk Import`):**
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
- **Page Inventory (30 Total):**
  - *Auth (4):* Login, Register, VerifyOtp, ForgotPassword.
  - *Student (11):* Dashboard, Profile, Milestones, Courses, Credits, Thesis, Events, Deadlines, Documents, Notifications, CompleteProfile (Onboarding).
  - *Supervisor (5):* Dashboard, StudentList, StudentDetail, Approvals, Events.
  - *Admin (9):* Dashboard, StudentManagement (with Milestone modal), FacultyManagement, SupervisorAssignment, SrcCommitteeManagement, FormManagement, BulkImport, GlobalSearch.
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

---

## 11. Recent Features & Architecture Updates (Faculty HOD, SRC Governance, Direct Course Management, Ordinance & Supervisor Portal Enhancements)

- **Faculty HOD Role**:
  - Strictly 1 faculty member can be designated as the Head of Department (HOD) at any time.
  - Assigning or updating a faculty member with `isHod: true` atomically unsets `isHod` on any previously designated HOD.
  - Displays a distinctive "HOD" badge in the faculty directory.
- **SRC Committee Governance**:
  - Chairperson in all SRC committees is permanently locked to the active HOD; admin has no ability to choose or change the chairperson.
  - Committee formation is rejected with HTTP 400 if no HOD has been designated.
  - Role-first member selection: Admin first selects the Role (`Member (CSE Internal)` or `External Member (Outside CSE)`).
  - Department constraints: `Member` is restricted to CSE faculty (`department === 'CSE'`), while `External Member` is restricted to faculty outside CSE (`department !== 'CSE'`).
  - Assigned supervisor, co-supervisor, and HOD are automatically excluded from the regular/external member picker.
- **Admin Direct Course Management**:
  - Admin direct endpoints: `GET`, `POST`, `PUT`, `DELETE` at `/api/admin/students/:studentId/courses`.
  - Admin can add and edit courses directly without requiring supervisor approval.
  - Setting course status to `completed` directly computes and awards credits to the scholar's semester credits record.
- **Form Preview**:
  - Admin can preview any uploaded form directly in Form Management via a secure modal with an embedded iframe viewer (`sandbox="allow-scripts allow-same-origin allow-forms"`, `loading="lazy"`), metadata summary, and external tab link.
- **Admin Navigation Restructuring**:
  - Deadlines and Events completely removed from Admin routes and navigation; only faculty have the option to create and manage events.
- **Faculty / Supervisor Enhancements**:
  - Top-left subheading displays actual designation (`user.designation || 'Faculty'`) instead of generic "supervisor".
  - "My Students" is partitioned into distinct program tabs: **PhD**, **M-Tech**, **B-Tech**, **MCA**.
  - Added "My Role" column with badge (`Supervisor` vs `Co-supervisor`) and "My Role" filter.
  - Removed research area filter from supervisor student directory.
  - Student detail page renames "Academics" tab to "Course Work".
  - Dedicated "Milestones" tab displays the full 12-milestone PhD journey timeline with due dates and statuses.
  - Documents tab defaults to most recent documents first and provides a Semester filter dropdown.
- **Faculty Event Creation Improvements**:
  - **Student-First Selection**: Faculty chooses a single scholar first (`[Name] ([Roll Number] - [Program/Type])`).
  - **Dynamic Event Type Filtering**: Candidate event types dynamically adapt to the chosen scholar:
    - `progress_seminar`: Progress Seminar (always available).
    - `comprehensive_exam`: Comprehensive Exam (hidden if scholar has completed comprehensive exam milestone).
    - `topic_registration`: Topic Registration (hidden if scholar has completed topic registration milestone).
    - `enhancement_seminar`: Enhancement Seminar (only shown for full-time FRP scholars who have not completed it).
    - `pre_submission`: Pre-Submission (hidden if scholar has completed pre-submission milestone).
    - `open_defence`: Open Defence (hidden if scholar has completed defense milestone).
    - `other`: Others (always available).
  - **Custom Event Type**: Selecting "Others" displays an accessible "Custom Event Type" text input so faculty can specify custom events.
  - **Removed Fields**: End time and deadline fields completely removed from the event creation modal.
  - **Table Custom Badges**: Displays custom event type directly in the event type badge (`Others: ${customEventType}`).
  - **Backend Support**: `Event` model updated with `customEventType` and optional `endTime`. `getEligibleStudentOptions` populates `completedMilestones` and `program`.

---

## 12. Forgot Password Feature
- **Backend Endpoints & Security**:
  - `POST /api/auth/forgot-password`: Validates email, verifies account is active, generates a 6-digit OTP via `createOTPRecord`, and dispatches a secure password reset email via `sendPasswordResetEmail`.
  - `POST /api/auth/reset-password`: Validates email, OTP, and new password (min 6 characters); verifies OTP hash and expiry via `verifyOTPRecord`; hashes new password with bcrypt; and revokes all active refresh tokens for the user (`RefreshToken.deleteMany({ user: user._id })`) to invalidate any stale sessions.
  - Test coverage: [`backend/src/__tests__/forgotPassword.test.ts`](backend/src/__tests__/forgotPassword.test.ts) (7 comprehensive tests passing).
- **Frontend Architecture & UI**:
  - `authApi.forgotPassword(email)` and `authApi.resetPassword(payload)` added to [`frontend/src/api/auth.ts`](frontend/src/api/auth.ts).
  - [`LoginPage.tsx`](frontend/src/pages/auth/LoginPage.tsx): Added accessible "Forgot password?" link adjacent to the password label; displays success alerts on redirect from reset flow (`location.state?.message`).
  - [`ForgotPasswordPage.tsx`](frontend/src/pages/auth/ForgotPasswordPage.tsx): Two-step password reset workflow matching portal's minimal, professional design system:
    - Step 1: Input email address and submit "Send Reset Code".
    - Step 2: Input 6-digit OTP code (`inputMode="numeric"`, `maxLength={6}`, `autoComplete="one-time-code"`), new password, and confirmation password with "Change email" and "Resend code" actions.
    - Full client-side validation and server error handling with `applyServerError`.
    - Redirects to `/auth/login` on success with success alert banner.
  - Route `/auth/forgot-password` registered in `App.tsx` with page title "Forgot Password".
  - Test coverage: [`frontend/src/pages/auth/__tests__/ForgotPasswordPage.test.tsx`](frontend/src/pages/auth/__tests__/ForgotPasswordPage.test.tsx) (8 comprehensive tests passing).
  - Subagent review loop: Aesthetic/UX, Performance, Code Quality, and Accessibility reviewers all reviewed and approved.


## 13. Admin Course Management Status Simplification
- **Status Options**:
  - In Admin Section > Students > Manage Course (both "Add Course" and "Edit Course" forms), the Status dropdown options are strictly simplified to two choices:
    - `completed`: 'Completed (Immediate Credits)' / 'Completed'
    - `pending`: 'Pending'
    - Removed 'approved' option.
- **Registered Courses Toggle Button**:
  - The status action button in the Registered Courses list dynamically toggles:
    - If status is `completed`: Displays `Mark Pending` (clicking updates status to `pending` and subtracts credits).
    - If status is not `completed`: Displays `Mark Completed` (clicking updates status to `completed` and awards credits immediately).
- **Backend & Verification**:
  - Dynamic credit calculation automatically handles status flips between `completed` and `pending` via `computeCreditsForSemester`.
  - Backend test suite [`backend/src/__tests__/adminCourseManagement.test.ts`](backend/src/__tests__/adminCourseManagement.test.ts) verified.
  - Multi-agent review loop: Aesthetic, Performance, Code Quality, and Accessibility reviewers all approved.
