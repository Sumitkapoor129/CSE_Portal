# Frontend Design Spec — CSE PhD Scholar Management Portal

## Overview

Build a complete React frontend for the existing Node.js/Express/MongoDB backend. The frontend lives in `frontend/` within the same repo and consumes the backend API at `http://localhost:5000/api`.

## Tech Stack

- React 18 + Vite + TypeScript
- Tailwind CSS for styling
- React Router v6 for routing
- No heavy state management libraries — React Context for auth only
- No UI component libraries — custom components using Tailwind

## Design Principles

Per `AGENTS.md`: Professional, Classy, Minimal, Modern, Fast. No flashy effects, no excessive animations, no gradients, no neon. Think enterprise software designed extremely well.

## File Structure

```
frontend/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── vite-env.d.ts
    │
    ├── api/
    │   ├── client.ts
    │   ├── auth.ts
    │   ├── student.ts
    │   ├── supervisor.ts
    │   └── admin.ts
    │
    ├── hooks/
    │   ├── useAuth.ts
    │   └── useApi.ts
    │
    ├── context/
    │   └── AuthContext.tsx
    │
    ├── components/
    │   ├── layout/
    │   │   ├── DashboardLayout.tsx
    │   │   ├── Sidebar.tsx
    │   │   ├── Header.tsx
    │   │   └── MobileNav.tsx
    │   ├── ui/
    │   │   ├── Button.tsx
    │   │   ├── Input.tsx
    │   │   ├── Select.tsx
    │   │   ├── Card.tsx
    │   │   ├── Table.tsx
    │   │   ├── Badge.tsx
    │   │   ├── Modal.tsx
    │   │   ├── Tabs.tsx
    │   │   ├── Pagination.tsx
    │   │   ├── Skeleton.tsx
    │   │   ├── Alert.tsx
    │   │   ├── EmptyState.tsx
    │   │   └── Spinner.tsx
    │   └── shared/
    │       ├── ProtectedRoute.tsx
    │       ├── NotificationBell.tsx
    │       └── PageHeader.tsx
    │
    ├── pages/
    │   ├── auth/
    │   │   ├── LoginPage.tsx
    │   │   ├── RegisterPage.tsx
    │   │   └── VerifyOtpPage.tsx
    │   ├── student/
    │   │   ├── StudentDashboard.tsx
    │   │   ├── StudentProfile.tsx
    │   │   ├── StudentMilestones.tsx
    │   │   ├── StudentCourses.tsx
    │   │   ├── StudentCredits.tsx
    │   │   ├── StudentThesis.tsx
    │   │   ├── StudentEvents.tsx
    │   │   ├── StudentDeadlines.tsx
    │   │   ├── StudentDocuments.tsx
    │   │   └── StudentNotifications.tsx
    │   ├── supervisor/
    │   │   ├── SupervisorDashboard.tsx
    │   │   ├── StudentList.tsx
    │   │   ├── StudentDetail.tsx
    │   │   ├── Approvals.tsx
    │   │   ├── SupervisorEvents.tsx
    │   │   └── ManageMilestones.tsx
    │   └── admin/
    │       ├── AdminDashboard.tsx
    │       ├── StudentManagement.tsx
    │       ├── FacultyManagement.tsx
    │       ├── SupervisorAssignment.tsx
    │       ├── SrcCommitteeManagement.tsx
    │       ├── SemesterManagement.tsx
    │       ├── CourseManagement.tsx
    │       ├── FormManagement.tsx
    │       ├── DeadlineManagement.tsx
    │       ├── EventManagement.tsx
    │       └── GlobalSearch.tsx
    │
    └── utils/
        ├── formatDate.ts
        ├── constants.ts
        └── validators.ts
```

## Design System

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| background | #ffffff | Main background |
| surface | #f9fafb | Cards, sidebar |
| border | #e5e7eb | All borders |
| text-primary | #111827 | Headings, body |
| text-secondary | #6b7280 | Metadata, labels |
| accent | #2563eb | Primary actions, links, active nav |
| accent-hover | #1d4ed8 | Hover states |
| success | #16a34a | Approved, completed |
| warning | #f59e0b | Pending, in-progress |
| error | #dc2626 | Errors, rejected |
| disabled | #d1d5db | Disabled elements |

### Typography

- Font: Inter (system font stack)
- Page Title: `text-2xl font-semibold text-gray-900`
- Section Head: `text-lg font-semibold text-gray-900`
- Subheading: `text-base font-medium text-gray-900`
- Body: `text-sm text-gray-700`
- Meta/Label: `text-xs text-gray-500 uppercase tracking-wide`

### Spacing

- Page padding: `p-6` (24px)
- Section gap: `space-y-6` (24px)
- Card padding: `p-6` (24px)
- Form field gap: `space-y-4` (16px)
- Inline gap: `gap-2` / `gap-3` (8px / 12px)
- Table cell: `px-4 py-3`

### Component Patterns

**Buttons:** Primary (`bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium`), Secondary (`bg-white text-gray-700 border border-gray-300 hover:bg-gray-50`), Danger (`bg-red-600 text-white hover:bg-red-700`)

**Inputs:** `block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`

**Cards:** `rounded-lg border border-gray-200 bg-white p-6` — no shadow by default

**Tables:** `divide-y divide-gray-200`, header `bg-gray-50 text-xs font-medium text-gray-500 uppercase`, rows `text-sm text-gray-700 hover:bg-gray-50`

**Badges:** Pending (amber), Approved/Completed (green), Rejected (red), In Progress (blue) — all with `bg-{color}-50 text-{color}-700 border border-{color}-200 rounded-full px-2.5 py-0.5 text-xs font-medium`

**Modals:** Overlay `bg-black/50`, Panel `bg-white rounded-lg p-6 max-w-lg`

## Routing

```
/auth/login                    → LoginPage
/auth/register                 → RegisterPage
/auth/verify-otp               → VerifyOtpPage

/student                       → StudentDashboard (role: student)
/student/profile               → StudentProfile
/student/milestones            → StudentMilestones
/student/courses               → StudentCourses
/student/credits               → StudentCredits
/student/thesis                → StudentThesis
/student/events                → StudentEvents
/student/deadlines             → StudentDeadlines
/student/documents             → StudentDocuments
/student/notifications         → StudentNotifications

/supervisor                    → SupervisorDashboard (role: supervisor)
/supervisor/students           → StudentList
/supervisor/students/:id       → StudentDetail
/supervisor/approvals          → Approvals
/supervisor/events             → SupervisorEvents
/supervisor/milestones         → ManageMilestones

/admin                         → AdminDashboard (role: admin)
/admin/students                → StudentManagement
/admin/faculty                 → FacultyManagement
/admin/assignments             → SupervisorAssignment
/admin/src-committees          → SrcCommitteeManagement
/admin/semesters               → SemesterManagement
/admin/courses                 → CourseManagement
/admin/forms                   → FormManagement
/admin/deadlines               → DeadlineManagement
/admin/events                  → EventManagement
/admin/search                  → GlobalSearch

/                              → Redirect to login or role dashboard
*                              → NotFoundPage
```

## Auth Flow

1. Token stored in `localStorage` as `token`
2. On app load: check localStorage for token → call `GET /api/auth/me` → if valid, set user in context; if 401, clear and redirect to login
3. API client automatically attaches `Authorization: Bearer <token>` header
4. 401 response → clear token → redirect to `/auth/login`
5. ProtectedRoute checks: token exists + user role matches route role
6. Login → store token → redirect to `/{role}` dashboard
7. Register → API → redirect to `/auth/verify-otp` with email
8. Verify OTP → API → store token → redirect to `/student`

## Key Page Designs

### Login Page
- Centered card on gray-50 background
- Email + password fields, Login button
- "Forgot password?" link, "Register" link

### Student Dashboard
- 4 stat cards: Credits (earned/required), Milestones (completed/11), Upcoming deadlines count, Pending course requests
- Milestones progress: horizontal step indicator
- Upcoming deadlines table
- Recent events cards

### Admin Dashboard
- 4 stat cards: Total students, Total faculty, Events this month, Pending approvals
- Recent activity list
- Quick action buttons

### Student List (Supervisor/Admin)
- Table: Name, Roll Number, Department, Student Type, Status
- Filters: name search, student type, department
- Pagination
- Click row → Student Detail

### Student Detail (Supervisor)
- Header: Name, roll number, type badge
- Tabs: Profile | Academics | Documents | Thesis | SRC
- Each tab shows relevant data

### Milestones
- Vertical checkpoint list with 11 milestones
- Status badges, title, description, dates
- Student: read-only; Supervisor/Admin: can update

## API Integration

Every API call maps directly to `backend.md`. No invented routes.

**API client** (`api/client.ts`):
- Base URL from `VITE_API_URL` env var (default `http://localhost:5000/api`)
- Auto-injects Bearer token from localStorage
- Unwraps `{ success, data }` responses
- Extracts `{ message }` from error responses
- 401 → clear token → redirect to login

**useApi hook**: Generic fetch wrapper returning `{ data, loading, error, refetch }`

## Loading/Error/Empty States

- **Loading:** Skeleton placeholders (animated gray bars) for tables and cards
- **Error:** Red alert banner with error message + "Try again" button
- **Empty:** Centered message — "No students found" / "No events scheduled"

## Responsive Design

- Desktop: sidebar + main content
- Tablet: collapsible sidebar
- Mobile: hamburger menu + full-width content
- Tables: horizontal scroll on small screens
- Forms: full-width inputs on mobile

## Dependencies

Minimal:
- `react`, `react-dom`
- `react-router-dom`
- `tailwindcss`, `postcss`, `autoprefixer`
- `@types/react`, `@types/react-dom` (dev)
- `vite`, `@vitejs/plugin-react` (dev)
- `typescript` (dev)

No heavy UI libraries, no state management libraries, no animation libraries.

## Performance

- Lazy loading for page components via `React.lazy` + `Suspense`
- No unnecessary re-renders — stable callbacks, proper dependency arrays
- Debounced search inputs
- Pagination for all list endpoints
- No large images
- No unnecessary animations
- Minimal bundle size target: <100KB gzipped

## Accessibility

- Semantic HTML (nav, main, header, table, form)
- Proper labels on all form inputs
- Keyboard navigation for sidebar, modals, tables
- Visible focus states (blue ring)
- Sufficient contrast ratios
- ARIA attributes only when necessary
