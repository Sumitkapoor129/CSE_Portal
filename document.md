# Document.md — Where Logic Lives

This document maps every feature (from the SRS) to the exact file/function that implements it.

## Project Structure

```
src/
├── app.ts                  → Express bootstrap, middleware wiring, route mounting, admin seeding
├── config/
│   ├── env.ts              → Environment variable loading (dotenv)
│   └── db.ts               → MongoDB connection (mongoose.connect)
├── models/                 → Mongoose schemas (one file per entity)
├── controllers/
│   ├── authController.ts   → Authentication logic (register/login/OTP/me/password)
│   ├── studentController.ts→ All student self-service features (SRS §5–§10)
│   ├── supervisorController.ts → Supervisor features (SRS §11–§13)
│   └── adminController.ts  → Admin features (SRS §14–§16)
├── routes/                 → Express routers (thin, delegate to controllers)
├── middleware/
│   ├── auth.ts             → JWT verification (authenticate) + RBAC (authorize)
│   └── errorHandler.ts     → AppError class, errorHandler, asyncHandler
├── types/index.ts          → All TypeScript enums + interfaces
└── utils/
    ├── otp.ts              → OTP generation/hash/verify + OTP records
    ├── email.ts            → Nodemailer transport, OTP email, notification email
    ├── notify.ts           → In-app Notification model helpers
    ├── audit.ts            → createAuditLog helper (SRS NFR-06)
    ├── pagination.ts       → Generic paginate helper
    ├── response.ts         → success/error response builders
    └── seedAdmin.ts        → Boot-time admin account seeding (SRS §3.3/FR-04)
```

---

## Authentication (SRS §4)

| Feature | File / Function | Notes |
| --- | --- | --- |
| FR-01 Student Registration | `authController.registerStudent` | Validates email + password, checks duplicates, creates `User` (role=student, inactive) + `StudentProfile`, generates OTP, emails it, returns JWT |
| FR-01 OTP | `utils/otp.createOTPRecord` → `utils/email.sendOTPEmail` | OTP is bcrypt-hashed before storing; expiry from `OTP_EXPIRY_MINUTES`; old unverified OTPs for the email are deleted |
| FR-01 Verify OTP | `authController.verifyOTP` → `utils/otp.verifyOTPRecord` | Marks user `isActive: true`. Login is blocked until active (`login` returns 403) |
| FR-02 Login | `authController.login` | `User.select('+password')` + bcrypt.compare. Returns JWT `{id, role, email}` |
| FR-03 Faculty Login | `adminController.createFaculty` + `authController.login` | No public registration for faculty; admin creates them with `isActive: true` |
| FR-04 Admin Login | `utils/seedAdmin` | Admin created at boot from `.env` (`ADMIN_EMAIL`/`ADMIN_PASSWORD`), never via registration |
| Token generation | `middleware/auth.generateToken` | JWT signed with `JWT_SECRET`, `expiresIn` from env |
| Route protection | `middleware/auth.authenticate` | Reads `Authorization: Bearer` header, verifies JWT, attaches `req.user` |
| RBAC | `middleware/auth.authorize(...roles)` | Rejects requests whose `req.user.role` isn't in the allowed list (403) |
| FR-05 First-login profile completion | `studentController.getProfile` + `StudentProfile.isProfileComplete` | Field exists on schema; `isProfileComplete` flag is set by client completing profile |

---

## Student Features (SRS §5–§10)

| Feature | File / Function | Notes |
| --- | --- | --- |
| FR-06 View Profile | `studentController.getProfile` | Populates user, supervisor, co-supervisor, SRC committee |
| FR-07 Edit Profile | `studentController.updateProfile` | Students may edit only `name`, `researchArea`, `profilePhoto`. Everything else is admin-only. Logs audit |
| FR-08 Admin Profile Modification | `adminController.updateStudent` | Admin can edit all profile fields + `name`/`email` on the User doc |
| FR-09 Semester Records | `studentController.getSemesters` / `createSemester` | Number of semesters is **not hardcoded** — new semesters are created dynamically (SRS OD-05) |
| FR-10 Semester Dashboard | `supervisorController.getStudentDetail` | Returns per-semester courses, credits, documents, timeline in one payload |
| FR-11 Degree Timeline | `studentController.getTimeline` | Builds timeline from Semester docs + StudentCourse aggregation (course entries) |
| FR-12 View Courses | `studentController.getCourses` | Scoped to own semester |
| FR-13 View Credits | `studentController.getCredits` | Per-semester (`?semesterId=`) or total across semesters |
| FR-14 Add Course Work | `studentController.addCourse` | Creates `Course` + `StudentCourse` both with status `pending` |
| FR-15 Supervisor Course Approval | `supervisorController.approveCourse` | Ownership check (student must be assigned), status must be `pending`, sets approvedBy/At, audit + notification |
| FR-16/17/18 Forms | Admin CRUD `adminController.listForms/createForm/updateForm/deleteForm` | Form records hold metadata + fileUrl; students fetch forms in future reads |
| FR-19 Form management admin | `adminController` form handlers | Semester/studentType applicability stored on Form |
| FR-20→23 Documents | `studentController.getDocuments` / `uploadDocument` | Only metadata stored (`fileUrl` points to object storage); uploadedBy + uploadDate + approvalStatus captured |
| FR-24 Thesis Upload | `studentController.submitThesis` | Auto-increments `version`, carries previous status forward |
| FR-25 Thesis Approval | `supervisorController.approveThesis` | Validates transitions: `submitted`/`under_review` → `approved`/`rejected`/`resubmission_required` |
| Student Dashboard | `studentController.getDashboard` | Returns profile, currentSemester, credits (earned/required/remaining), milestones (from `milestoneService`), nextMilestone, upcomingDeadlines, upcomingEvents, pendingCourseRequests, thesis, unreadNotifications |
| Student Events | `studentController.getEvents` | Lists events where user is a participant; query `upcoming=true` filters by date >= now |
| Student Deadlines | `studentController.getDeadlines` | Lists deadlines scoped to student's profile/semesters/global; query `upcoming=true` |
| Student Forms | `studentController.getForms` | Forms filtered by studentType and current-semester applicability |
| Student Milestones | `studentController.getMilestones` | Returns milestone checklist (11 items, ordered by `order`) |
| Milestone Seeding | `authController.registerStudent` → `milestoneService` | Registration auto-seeds 11-step milestone checklist for new students |

---

## Supervisor Features (SRS §11–§13)

| Feature | File / Function | Notes |
| --- | --- | --- |
| FR-26 Supervisor Assignment | `adminController.assignSupervisor` | Deactivates old active assignment, creates new `Supervisor` doc, updates StudentProfile, notifies student |
| FR-27 Supervisor Request (optional) | `supervisorController.approveRequest` | Generic approval of `ApprovalRequest` docs created by students |
| FR-28 Supervisor Dashboard | `supervisorController.getDashboard` | Counts assigned students, pending course/thesis/general approvals, upcoming events |
| FR-29 Filter Assigned Students | `supervisorController.getAssignedStudents` | Filters: `name`, `rollNumber`, `semester`, `studentType`, `researchArea` (all optional query params) |
| FR-30 Create Event | `supervisorController.createEvent` | Requires title/type/date/start/end; participants as user-id array |
| FR-31 Multi-student Event | `supervisorController.createEvent` | `participants` array → one event visible to all selected users; bulk inserts notifications |
| FR-32 Eligible Student Selection | `Event.eligibilityRules` (Mixed type) | Rules stored per event (semi-configurable); eligibility evaluation left to client/business layer for custom rules (SRS OD-07) |
| FR-33 Admin Event Management | `adminController.createEvent/updateEvent/deleteEvent/listEvents` | Admin can schedule for students and faculty |
| Eligible Student Options | `supervisorController.getEligibleStudentOptions` | Returns eligible students assigned to this supervisor |
| Supervisor Milestone Update | `supervisorController.updateMilestone` | Updates milestone (status/dueDate/title/description); verifies student is assigned to supervisor; sets `completedAt` on complete |

---

## SRC Committee (SRS §14)

| Feature | File / Function | Notes |
| --- | --- | --- |
| FR-34 Committee Creation | `adminController.createSRCCommittee` | Members: `{faculty, role}` — role ∈ chairperson/supervisor/co_supervisor/member |
| FR-35 Committee Member Request | `supervisorController.approveRequest` | General `ApprovalRequest` flow reused for faculty-approval workflows (SRS OD-04) |
| FR-36 Committee Editing | `adminController.updateSRCCommittee` | Replaces `members` array; history via audit log |
| FR-37 View Committee | `studentController.getProfile` / `supervisorController.getStudentDetail` (populate `srcCommittee`) |

---

## Notifications (SRS §15)

| Feature | File / Function | Notes |
| --- | --- | --- |
| FR-38 In-app notifications | `utils/notify.createNotification` / `createBulkNotifications` | Stored in Notification collection, queried by user |
| FR-39 Deadline notifications | `adminController.createDeadline` (creates deadline docs) + `deadlineService.checkDeadlines` (scheduler) | `Deadline.notificationSent` flag; scheduler runs on startup and every 6 hours, finds unsent deadlines due within 7 days, creates Notification + email per affected student |
| FR-40 Email | `utils/email.sendNotificationEmail` | Called by deadline scheduler and event creation; sends notification emails to affected users |
| FR-41 Faculty notifications | Notifications created on: thesis approval, course approval, request approval, student account toggles, event creation | Sent from the respective controllers |

---

## Admin Management (SRS §16)

| Feature | File / Function | Notes |
| --- | --- | --- |
| FR-42 Student Management | `adminController.createStudent/updateStudent/toggleStudentActive/listStudents` | Search by name/email/collegeId/rollNumber |
| FR-43 Faculty Management | `adminController.createFaculty/updateFaculty/toggleFacultyActive/listFaculty` | Search by name/email/employeeId |
| FR-44 Global Search | `adminController.globalSearch` | Regex over collegeId/rollNumber/employeeId + User name/email |
| Admin Dashboard | `adminController.getDashboard` | Counts students, faculty, events, pending approvals |
| Admin Milestone Update | `adminController.updateMilestone` | Updates milestone (status/dueDate/title/description); no ownership check; sets `completedAt` on complete |

---

## Cross-Cutting

| Concern | Where |
| --- | --- |
| Audit logging (NFR-06) | `utils/audit.createAuditLog` — invoked in profile update, semester create, course add, document upload, thesis submit, all approvals, all admin mutations |
| Soft-delete (BR-12) | Partially: supervisor reassignment deactivates old record (`isActive=false`). Event delete is hard delete (change to soft if needed) |
| File storage (SRS §26) | Docs reference `fileUrl`; no binary files in MongoDB (S3/object storage expected) |
| Rate limiting | `app.ts` — express-rate-limit, 100 req / 15 min on `/api` |
| Security headers | `app.ts` — helmet |
| Error handling | `middleware/errorHandler` — AppError (4xx) vs unhandled (500) |
| Password hashing | bcryptjs, cost 12, in `authController` + `adminController` |
| Pagination | `utils/pagination.paginate` — used by all list endpoints |

---

## Services

| Service | File / Notes |
| --- | --- |
| Student dashboard | `studentController.getDashboard` — aggregates profile, credits, milestones, deadlines, events, requests, thesis, notifications |
| Milestones | `src/services/milestoneService.ts` — 11-step checklist seeded on registration, ordered by `order` |
| Deadline scheduler | `src/services/deadlineService.ts` — runs on startup and every 6 hours, finds unsent deadlines due within 7 days, creates Notification + email per affected student, sets `notificationSent` |
| Credit auto-compute | `src/services/creditService.ts` — computes credits from approved StudentCourse↔Course joins instead of hand-maintained |
| Participant resolution | `src/utils/participants.ts` — resolves participant ids (User or StudentProfile) to User ids for event creation |

---

## Key Models → Schema Locations

| Entity | Model file |
| --- | --- |
| User (auth, roles) | `src/models/User.ts` |
| Student profile | `src/models/StudentProfile.ts` |
| Faculty profile | `src/models/FacultyProfile.ts` |
| Semester | `src/models/Semester.ts` |
| Course | `src/models/Course.ts` |
| Student ↔ Course (approval) | `src/models/StudentCourse.ts` |
| Credits | `src/models/Credits.ts` |
| Documents | `src/models/Document.ts` |
| Forms | `src/models/Form.ts` |
| Thesis | `src/models/Thesis.ts` |
| Supervisor assignment | `src/models/Supervisor.ts` |
| SRC Committee | `src/models/SRCCommittee.ts` |
| Events | `src/models/Event.ts` |
| Deadlines | `src/models/Deadline.ts` |
| Notifications | `src/models/Notification.ts` |
| Approval requests | `src/models/ApprovalRequest.ts` |
| Audit logs | `src/models/AuditLog.ts` |
| OTP | `src/models/OTP.ts` |

---

## Setup / Run

```bash
npm install
cp .env.example .env   # set MONGODB_URI, JWT_SECRET, SMTP, ADMIN creds
npm run dev            # ts-node-dev, watches src
# build + run prod:
npm run build && npm start
```

Typecheck: `npm run typecheck` · Lint: `npm run lint`