# Graph Report - CSE_portal  (2026-09-16)

## Corpus Check
- 204 files · ~138,267 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 2, .example 2, .tsbuildinfo 2)

## Summary
- 1114 nodes · 3095 edges · 76 communities (55 shown, 21 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Dashboard Layout & Shell
- Deadline & Semester Models
- Frontend API Clients
- Auth Pages & API
- JS Ecosystem & Config
- Shared Page Components
- Event Management UI
- Student Deadline UI
- App Routing & Titles
- Supervisor Approvals Controller
- Credits & Notification Models
- Frontend Task Pipeline
- Admin Management Controller
- Debug & Optimize Backend Fixes
- Student Courses Controller
- Supervisor Student Views
- Accessibility & API Foundations
- Auth UX Supervisor Gates
- Frontend Tooling Config
- Express App & Server Lifecycle
- Approval & Course Models
- Auth Controller
- Root tsconfig
- Auth UX UI Components
- Frontend tsconfig
- Backend Test Tooling
- Milestone Service
- Error Handling UI
- Milestone Checklist Seeding
- Vite tsconfig
- Root Package Scripts
- Backend Dependencies
- Backend Architecture Notes
- Infrastructure Components
- Navigation Configuration
- Review Workflow Philosophy
- OTP Model & Util
- API Documentation
- Token Refresh Sessions
- Package Scripts
- Event Types
- Thesis Status
- Audit Log Model
- Event Model
- Test Result Shaping
- SDD Governance Artifacts
- Milestone & Student Types
- Form Model
- Refresh Token Model
- Email Service
- Refresh-Aware Fetch & Onboarding
- Auth UI Components
- Accessibility Audit Findings
- Design Review Findings
- React ErrorBoundary
- Monorepo tsconfig
- Semester & Supervisor Gates
- Dev Workflow Rules
- Tailwind Motion Constraints
- Smoke Checklist
- Admin Event Semester Gap
- Auth Static Imports
- jsdom Early Install
- Git Workflow Note
- Tailwind Vite Plugin
- Custom Auth Events
- FE-B Pages Brief
- FE-A Shell Brief
- Debug Optimize Ledger
- Backend Fix Report
- Frontend Pages Report
- Frontend Shell Report

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 65 edges
2. `react` - 59 edges
3. `AppError` - 58 edges
4. `useApi()` - 50 edges
5. `react-router-dom` - 37 edges
6. `mongoose` - 36 edges
7. `createAuditLog()` - 31 edges
8. `formatDate()` - 31 edges
9. `cn()` - 29 edges
10. `Card()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `Project Context Session Handoff` --references--> `Auth UX Supervisor Gates Plan`  [INFERRED]
  context.md → docs/superpowers/plans/2026-09-16-auth-ux-supervisor-gates.md
- `Project Context Session Handoff` --references--> `Frontend Design Specification`  [INFERRED]
  context.md → docs/superpowers/specs/2026-09-08-frontend-design.md
- `Frontend Entry HTML` --references--> `Frontend Design Specification`  [INFERRED]
  frontend/index.html → docs/superpowers/specs/2026-09-08-frontend-design.md
- `Design System Tokens` --implements--> `Professional Minimal Design Philosophy`  [EXTRACTED]
  docs/superpowers/specs/2026-09-08-frontend-design.md → AGENTS.md
- `Project Context Session Handoff` --references--> `Software Requirements Specification`  [EXTRACTED]
  context.md → Requirement.txt

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Auth UX Supervisor Gates Implementation** — superpowers_sdd_2026-09-16-auth-ux-supervisor-gates_structured-auth-errors, superpowers_sdd_2026-09-16-auth-ux-supervisor-gates_access-refresh-token-sessions, superpowers_sdd_2026-09-16-auth-ux-supervisor-gates_refresh-aware-fetch-client, superpowers_sdd_2026-09-16-auth-ux-supervisor-gates_auth-context, superpowers_sdd_2026-09-16-auth-ux-supervisor-gates_student-onboarding-wizard [EXTRACTED 0.90]
- **Debug Optimize Security Fixes** — superpowers_sdd_debug-and-optimize_security-defaults, superpowers_sdd_debug-and-optimize_deactivated-users-refresh, superpowers_sdd_debug-and-optimize_jwt-algorithm-pinning, superpowers_sdd_debug-and-optimize_cors [EXTRACTED 0.95]
- **Debug Optimize Performance Fixes** — superpowers_sdd_debug-and-optimize_deadline-scheduler, superpowers_sdd_debug-and-optimize_semester-scoped-scheduler, superpowers_sdd_debug-and-optimize_student-controller-dashboard-parallelism, superpowers_sdd_debug-and-optimize_participant-resolution-n1, superpowers_sdd_debug-and-optimize_student-course-index [EXTRACTED 0.90]
- **Task implementation lifecycle (brief → implement → report → review → done)** — .superpowers_sdd_frontend_implementation_briefs_task_1_brief_scaffold_frontend_project, .superpowers_sdd_frontend_implementation_reports_task_1_report_scaffold, .superpowers_sdd_frontend_implementation_progress_sdd_ledger, concept_sdd_subagent_driven_workflow [EXTRACTED 0.95]
- **Auth flow architecture (login → OTP → token → role redirect)** — .superpowers_sdd_frontend_implementation_briefs_task_3_brief_auth_state_useapi_route_guard, .superpowers_sdd_frontend_implementation_briefs_task_6_brief_auth_pages_initial_routing, concept_role_based_routing_architecture, concept_success_envelope_api_pattern, rationale_unauthorized_event_dispatch [EXTRACTED 0.90]
- **UI component system (primitives + layout + pages)** — .superpowers_sdd_frontend_implementation_briefs_task_4_brief_ui_primitives, .superpowers_sdd_frontend_implementation_briefs_task_5_brief_application_shell, rationale_full_literal_tailwind_classes, concept_shared_nav_config_pattern, rationale_spinner_no_animate_spin [EXTRACTED 0.85]
- **Subagent Review Workflow for Frontend Tasks** — agents_md_ui_implementation_agent, agents_md_aesthetic_ux_reviewer, agents_md_performance_reviewer, agents_md_code_quality_reviewer, agents_md_accessibility_reviewer [EXTRACTED 1.00]
- **Auth UX Supervisor Gates Feature Set F1-F8** — docs_superpowers_plans_2026_09_16_auth_ux_supervisor_gates_f1, docs_superpowers_plans_2026_09_16_auth_ux_supervisor_gates_f2, docs_superpowers_plans_2026_09_16_auth_ux_supervisor_gates_f3, docs_superpowers_plans_2026_09_16_auth_ux_supervisor_gates_f4, docs_superpowers_plans_2026_09_16_auth_ux_supervisor_gates_f5, docs_superpowers_plans_2026_09_16_auth_ux_supervisor_gates_f6, docs_superpowers_plans_2026_09_16_auth_ux_supervisor_gates_f7, docs_superpowers_plans_2026_09_16_auth_ux_supervisor_gates_f8 [EXTRACTED 1.00]
- **SRS to Backend to Frontend Documentation Chain** — requirement_txt_srs, backend_md_api_doc, document_md_feature_map, docs_superpowers_specs_2026_09_08_frontend_design_spec, docs_superpowers_plans_2026_09_08_frontend_implementation_plan [EXTRACTED 1.00]

## Communities (76 total, 21 thin omitted)

### Community 0 - "Dashboard Layout & Shell"
Cohesion: 0.09
Nodes (42): DashboardLayout(), emptyForm, FieldErrors, Header(), PasswordForm, MobileNav(), Sidebar(), ConfirmModal() (+34 more)

### Community 1 - "Deadline & Semester Models"
Cohesion: 0.09
Nodes (36): Deadline, deadlineSchema, IDeadlineDocument, ISemesterDocument, Semester, semesterSchema, IStudentCourseDocument, StudentCourse (+28 more)

### Community 2 - "Frontend API Clients"
Cohesion: 0.07
Nodes (47): AuthContextValue, MemberRow, AdminCreateFaculty, AdminCreateStudent, AdminDashboardData, AdminEventPayload, AdminUpdateFaculty, AdminUpdateStudent (+39 more)

### Community 3 - "Auth Pages & API"
Cohesion: 0.08
Nodes (30): authApi, AuthTokens, LoginPayload, RegisterPayload, ApiEnvelope, ApiError, apiFetch(), clearStoredToken() (+22 more)

### Community 4 - "JS Ecosystem & Config"
Cohesion: 0.05
Nodes (43): dependencies, react, react-dom, react-router-dom, devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks (+35 more)

### Community 5 - "Shared Page Components"
Cohesion: 0.18
Nodes (23): adminApi, studentApi, PageHeader(), PageHeaderProps, QueryError(), QueryErrorProps, StatCard(), StatCardProps (+15 more)

### Community 6 - "Event Management UI"
Cohesion: 0.13
Nodes (28): EventManagement, SupervisorEvents, ParticipantOption, ParticipantPicker(), ParticipantPickerProps, Badge(), BadgeProps, Select() (+20 more)

### Community 7 - "Student Deadline UI"
Cohesion: 0.11
Nodes (37): DueDateCell(), DueDateCellProps, useAuth(), useApi(), AdminDashboard(), DeadlineManagement(), EventManagement(), FacultyManagement() (+29 more)

### Community 8 - "App Routing & Titles"
Cohesion: 0.06
Nodes (34): AdminDashboard, App(), DeadlineManagement, DocumentTitle(), FacultyManagement, FormManagement, getRouteTitle(), GlobalSearch (+26 more)

### Community 9 - "Supervisor Approvals Controller"
Cohesion: 0.12
Nodes (32): createEvent, approveCourse, approveRequest, approveThesis, createEvent, getAssignedStudents, getDashboard, getEligibleStudents (+24 more)

### Community 10 - "Credits & Notification Models"
Cohesion: 0.09
Nodes (27): Credits, creditsSchema, ICreditsDocument, INotificationDocument, Notification, notificationSchema, ISRCCommitteeDocument, SRCCommittee (+19 more)

### Community 11 - "Frontend Task Pipeline"
Cohesion: 0.07
Nodes (32): Task 10: Lazy Loading, ErrorBoundary, and Polish, Task 1: Scaffold the frontend project, Task 2: Core domain types, API client, and utilities, Task 3: Auth state, generic useApi hook, and route guard, Task 4: UI primitives, Task 5: Application shell (layout, sidebar, header, mobile nav), Task 6: Auth pages + initial routing, Task 7: Student module (+24 more)

### Community 12 - "Admin Management Controller"
Cohesion: 0.17
Nodes (28): assignSupervisor, createDeadline, createFaculty, createForm, createSRCCommittee, createStudent, deleteEvent, deleteForm (+20 more)

### Community 13 - "Debug & Optimize Backend Fixes"
Cohesion: 0.08
Nodes (31): 4xx Classification, Admin Controller, Auth Controller Slim /auth/me, Backend Lint, Backend Tooling, Backend Fix Brief for Correctness, Security, and Performance, Broken Features, CORS (+23 more)

### Community 14 - "Student Courses Controller"
Cohesion: 0.17
Nodes (26): addCourse, createSemester, deriveSemesterDates(), getCourses, getCredits, getDashboard, getDocuments, getMyDeadlines (+18 more)

### Community 15 - "Supervisor Student Views"
Cohesion: 0.13
Nodes (21): supervisorApi, Approvals, StudentDashboard, StudentDetail, DetailRow(), DetailRowProps, EmptyState(), EmptyStateProps (+13 more)

### Community 16 - "Accessibility & API Foundations"
Cohesion: 0.12
Nodes (23): Accessibility Reviewer, ProtectedRoute Rendering Bug Fix, apiFetch API Client, AuthContext Provider, Known Backend Gaps, Design Token System, ErrorBoundary Component, React Lazy Code Splitting (+15 more)

### Community 17 - "Auth UX Supervisor Gates"
Cohesion: 0.12
Nodes (23): MilestoneKey 11-Step Checklist, F3 Sequential Semester Creation, F4 Supervisor Required Actions, Supervisor Gate Guard, Admin Controller, Student Controller, Supervisor Controller, Administrator User Role (+15 more)

### Community 18 - "Frontend Tooling Config"
Cohesion: 0.10
Nodes (20): description, eslint, typescript, typescript-eslint, main, name, version, jest (+12 more)

### Community 19 - "Express App & Server Lifecycle"
Cohesion: 0.13
Nodes (17): app, limiter, start(), startDeadlineScheduler(), connectDB(), env, router, router (+9 more)

### Community 20 - "Approval & Course Models"
Cohesion: 0.12
Nodes (17): ApprovalRequest, approvalRequestSchema, IApprovalRequestDocument, Course, courseSchema, ICourseDocument, DocumentModel, documentSchema (+9 more)

### Community 21 - "Auth Controller"
Cohesion: 0.26
Nodes (16): buildUserPayload(), changePassword, getMe, login, logout, refreshToken, registerStudent, verifyOTP (+8 more)

### Community 22 - "Root tsconfig"
Cohesion: 0.11
Nodes (18): compilerOptions, baseUrl, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module (+10 more)

### Community 23 - "Auth UX UI Components"
Cohesion: 0.15
Nodes (19): Avatar Component, Error Field Helpers, F1 Structured Auth Errors, F2 Show Password Toggle, F5 Responsive Logout Sidebar Identity, F6 Profile Photo Display, F7 Onboarding Wizard, F8 Refresh Access Token Sessions (+11 more)

### Community 24 - "Frontend tsconfig"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 25 - "Backend Test Tooling"
Cohesion: 0.12
Nodes (17): devDependencies, eslint, jest, mongodb-memory-server, supertest, ts-jest, ts-node-dev, @types/bcryptjs (+9 more)

### Community 26 - "Milestone Service"
Cohesion: 0.20
Nodes (13): IMilestoneDocument, Milestone, milestoneSchema, DEFAULT_MILESTONES, seedMilestones(), updateMilestone(), STUDENT_ID, IMilestone (+5 more)

### Community 27 - "Error Handling UI"
Cohesion: 0.15
Nodes (10): NotFoundPage, ErrorBoundaryProps, ErrorBoundaryState, ButtonLink(), ButtonLinkProps, ButtonProps, ButtonSize, buttonSizes (+2 more)

### Community 28 - "Milestone Checklist Seeding"
Cohesion: 0.15
Nodes (13): MilestoneSeed, MilestoneKey, ADMISSION, COMPREHENSIVE_EXAM, COURSE_WORK, DEFENSE, DEGREE_AWARDED, ENHANCEMENT_SEMINAR (+5 more)

### Community 29 - "Vite tsconfig"
Cohesion: 0.15
Nodes (12): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+4 more)

### Community 30 - "Root Package Scripts"
Cohesion: 0.15
Nodes (12): devDependencies, concurrently, name, private, scripts, build, dev, start (+4 more)

### Community 31 - "Backend Dependencies"
Cohesion: 0.17
Nodes (12): dependencies, bcryptjs, cors, dotenv, express, express-rate-limit, helmet, jsonwebtoken (+4 more)

### Community 32 - "Backend Architecture Notes"
Cohesion: 0.18
Nodes (11): Participant ID Resolution, Supervisor API Routes, Credit Service Auto-Compute, Audit Logging System, Auth Controller, Credit Service Reference, Feature-to-File Implementation Map, Pagination Helper (+3 more)

### Community 33 - "Infrastructure Components"
Cohesion: 0.22
Nodes (11): Auth Middleware JWT Verify, Configurable Semester Count, Deadline Service Scheduler, Nodemailer Email System, MongoDB Atlas Connection, NIT Jamshedpur CSE Department, Project Context Session Handoff, Rate Limiting 100 Req Per 15 Min (+3 more)

### Community 34 - "Navigation Configuration"
Cohesion: 0.31
Nodes (9): getNavItemsForRole(), isNavIndex(), NAV_ITEMS, NAV_LINK_ACTIVE, NAV_LINK_BASE, NAV_LINK_INACTIVE, NavItem, NavList() (+1 more)

### Community 35 - "Review Workflow Philosophy"
Cohesion: 0.27
Nodes (10): Aesthetic UX Reviewer, Code Quality Reviewer, Professional Minimal Design Philosophy, Frontend Development Guidelines, Git Branch-Per-Feature Rule, Golden Rule Priority Order, Performance-First Principle, Performance Latency Reviewer (+2 more)

### Community 36 - "OTP Model & Util"
Cohesion: 0.29
Nodes (8): IOTPDocument, OTP, otpSchema, compareOTP(), createOTPRecord(), generateOTP(), hashOTP(), verifyOTPRecord()

### Community 37 - "API Documentation"
Cohesion: 0.25
Nodes (9): Admin API Routes, Backend API Documentation, Auth API Routes, Deadline Notification Scheduler, API Error Code Standards, JWT Bearer Authentication, SRC Committee Chairperson Validation, Node Express TypeScript MongoDB Stack (+1 more)

### Community 38 - "Token Refresh Sessions"
Cohesion: 0.25
Nodes (8): Access + Refresh Token Sessions, AuthTokens Interface, Refresh Token Flow, Backend Implementation Report for Auth & UX / Supervisor Gates, Sequential Semester Creation, Structured Auth Errors, Student Profile Fields, Supervisor Required for Academic Actions

### Community 39 - "Package Scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, start, test, typecheck

### Community 40 - "Event Types"
Cohesion: 0.29
Nodes (7): EventType, COMPREHENSIVE_EXAM, COURSE_REGISTRATION, OTHER, PROGRESS_REVIEW, SEMINAR, THESIS_DEFENSE

### Community 41 - "Thesis Status"
Cohesion: 0.29
Nodes (7): ThesisStatus, APPROVED, DRAFT, REJECTED, RESUBMISSION_REQUIRED, SUBMITTED, UNDER_REVIEW

### Community 42 - "Audit Log Model"
Cohesion: 0.47
Nodes (4): AuditLog, auditLogSchema, IAuditLogDocument, IAuditLog

### Community 43 - "Event Model"
Cohesion: 0.40
Nodes (5): Event, eventParticipantSchema, eventSchema, IEventDocument, IEvent

### Community 44 - "Test Result Shaping"
Cohesion: 0.67
Nodes (6): asRecord(), FacultyResults(), resultKey(), StudentResults(), text(), userOf()

### Community 45 - "SDD Governance Artifacts"
Cohesion: 0.33
Nodes (6): Gates, Implementer Reports, Integration Edits, SDD Ledger for Auth UX Supervisor Gates, Rulings, SDD Ledger

### Community 46 - "Milestone & Student Types"
Cohesion: 0.40
Nodes (5): Milestone Checklist Auto-Seeding, Student API Routes, Student Types FRP and ERP, Milestone Service, Milestone Service Reference

### Community 47 - "Form Model"
Cohesion: 0.50
Nodes (4): Form, formSchema, IFormDocument, IForm

### Community 48 - "Refresh Token Model"
Cohesion: 0.50
Nodes (4): IRefreshTokenDocument, RefreshToken, refreshTokenSchema, IRefreshToken

### Community 49 - "Email Service"
Cohesion: 0.50
Nodes (4): sendEmail(), sendOTPEmail(), transporter, nodemailer

### Community 50 - "Refresh-Aware Fetch & Onboarding"
Cohesion: 0.40
Nodes (5): AuthContext, Refresh-Aware Fetch Client, Report for Tasks 6 and 11 - Refresh-Aware Fetch Client and Student Onboarding Wizard, Student Onboarding Wizard, StudentOnboarding Page

### Community 51 - "Auth UI Components"
Cohesion: 0.40
Nodes (5): Auth Error Surfacing, Avatar Component, PasswordInput Component, Report for Tasks 7, 8, 9 - PasswordInput, Errors, Avatar, Responsive Header Dropdown, Responsive Header Dropdown

### Community 52 - "Accessibility Audit Findings"
Cohesion: 0.40
Nodes (5): Contrast Failures, Per-Route Document Title, Accessibility Audit Report, Tabs ARIA Pattern, Wizard Focus Management

### Community 53 - "Design Review Findings"
Cohesion: 0.50
Nodes (4): Design System Consistency, Loading/Error/Empty States, Aesthetic / UX Review, Restrained Color Palette

### Community 57 - "Semester & Supervisor Gates"
Cohesion: 0.67
Nodes (3): Report for Task 10 - Semester Sequencing and Supervisor Gate, Semester Sequencing, Supervisor Gate

## Knowledge Gaps
- **392 isolated node(s):** `name`, `version`, `description`, `main`, `dev` (+387 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 425 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Dashboard Layout & Shell` to `Navigation Configuration`, `Auth Pages & API`, `JS Ecosystem & Config`, `Shared Page Components`, `Event Management UI`, `App Routing & Titles`, `Supervisor Student Views`, `Error Handling UI`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `mongoose` connect `Deadline & Semester Models` to `OTP Model & Util`, `Supervisor Approvals Controller`, `Credits & Notification Models`, `Audit Log Model`, `Event Model`, `Admin Management Controller`, `Form Model`, `Refresh Token Model`, `Frontend Tooling Config`, `Express App & Server Lifecycle`, `Approval & Course Models`, `Milestone Service`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _392 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dashboard Layout & Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.09468147282291058 - nodes in this community are weakly interconnected._
- **Should `Deadline & Semester Models` be split into smaller, more focused modules?**
  _Cohesion score 0.09427609427609428 - nodes in this community are weakly interconnected._
- **Should `Frontend API Clients` be split into smaller, more focused modules?**
  _Cohesion score 0.07372549019607844 - nodes in this community are weakly interconnected._
- **Should `Auth Pages & API` be split into smaller, more focused modules?**
  _Cohesion score 0.0782312925170068 - nodes in this community are weakly interconnected._