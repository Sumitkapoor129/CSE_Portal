# Task 5 Brief: Application shell (layout, sidebar, header, mobile nav)

Full plan: `docs/superpowers/plans/2026-09-08-frontend-implementation.md` (lines 1436–1469)
Design spec (REQUIRED reading): `docs/superpowers/specs/2026-09-08-frontend-design.md` (Layout, Navigation, Header sections)

IMPORTANT REPO RULES:
- This repo has NO git. Do NOT run any git commands. Skip the plan's commit step.
- Work from repo root `C:\Users\91983\Desktop\VibeCoded\CSE_portal`. All code under `frontend/`.
- NEVER add code comments. No emoji.
- Professional, minimal, classy. No gradients/glows/heavy shadows. Only animation allowed: `animate-pulse` (plus minimal `transition-colors` for interactive states).
- No runtime-constructed Tailwind class names. Full literal class strings only.

## Context — components already available (reuse, do not recreate)
- `frontend/src/components/ui/`: `Button.tsx`, `Input.tsx`, `Select.tsx`, `Card.tsx`, `Table.tsx`, `Badge.tsx`, `Modal.tsx`, `Tabs.tsx`, `Pagination.tsx`, `Skeleton.tsx`, `Alert.tsx`, `EmptyState.tsx`, `Spinner.tsx`, and `frontend/src/components/shared/PageHeader.tsx`.
- `frontend/src/context/AuthContext.tsx` exports `useAuth` with `{ user, initializing, login, logout, reload }`.
- `frontend/src/api/auth.ts` exports `authApi.changePassword(currentPassword, newPassword)`.
- `frontend/src/utils/constants.ts` exports `ROLE_LABELS` (`Record<UserRole,string>`).
- `frontend/src/types/index.ts` exports `UserRole`, `AuthUser`.

## Files to create
1. `frontend/src/components/layout/Sidebar.tsx`
2. `frontend/src/components/layout/Header.tsx`
3. `frontend/src/components/layout/MobileNav.tsx`
4. `frontend/src/components/layout/DashboardLayout.tsx`
5. `frontend/src/pages/NotFoundPage.tsx`

## Interfaces / behavior

### Sidebar.tsx — `export function Sidebar(): JSX.Element`
Desktop (`hidden lg:flex`) vertical nav. Fixed width `w-64`, `border-r border-gray-200 bg-white`, full height. Brand block at top: a small blue rounded square ("CSE") + "PhD Scholar Portal · NIT Jamshedpur" text (`font-semibold text-gray-900`), smaller role label under it (`text-xs text-gray-500`). Nav list role-aware from `useAuth().user.role`:
- student → `/student` Dashboard, `/student/profile` Profile, `/student/milestones` Milestones, `/student/courses` Courses, `/student/credits` Credits, `/student/thesis` Thesis, `/student/events` Events, `/student/deadlines` Deadlines, `/student/documents` Documents, `/student/notifications` Notifications
- supervisor → `/supervisor` Dashboard, `/supervisor/students` My Students, `/supervisor/approvals` Approvals, `/supervisor/events` Events
- admin → `/admin` Dashboard, `/admin/students` Students, `/admin/faculty` Faculty, `/admin/assignments` Assignments, `/admin/src-committees` SRC Committees, `/admin/forms` Forms, `/admin/deadlines` Deadlines, `/admin/events` Events, `/admin/search` Search

Nav item: `<NavLink to={...} end={...}>` (DEFAULT the index routes use `end`). Active: `bg-blue-50 text-blue-700 font-medium`; inactive: `text-gray-600 hover:bg-gray-100 hover:text-gray-900`. Layout: `flex items-center gap-2 rounded-md px-3 py-2 text-sm`. Wrapped in `<nav aria-label="Main navigation">`. Use `ROLE_LABELS[role]` for the role label; if `user` or `role` missing render nothing (sidebar only meaningful inside DashboardLayout under an authenticated route).

### Header.tsx — `export function Header(): JSX.Element`
Top bar: `flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6`. Left: `MobileNav` hamburger (renders on `lg:hidden` only — implement hamburger toggle here or inside MobileNav as a self-contained drawer; prefer MobileNav owns its trigger + drawer). Right: user avatar + name with a dropdown menu:
- Avatar: `flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white` showing initials (first letters of user.name).
- Name + role: `text-sm font-medium text-gray-900` name, `text-xs text-gray-500` roleLabel, hidden on small screens.
- Dropdown (native button, `aria-haspopup="menu"`, `aria-expanded`): items **Change Password** (opens a Modal with old password + new password inputs + confirm new, validates `required`+ length ≥ 8, calls `authApi.changePassword`, on success show success Alert in modal and close after a short beat or keep open with success message; on error show error Alert) and **Sign out** (calls `logout()` then `navigate('/auth/login', { replace: true })`).
- Use a `useEffect` click-outside to close the dropdown and Escape to close (reuse the separation-of-concerns: keep it simple, a small dropdown with local open state).

### MobileNav.tsx — `export function MobileNav(): JSX.Element`
Renders only below `lg` (the hamburger trigger is `lg:hidden`). Button `aria-label="Open menu"` with hamburger icon. Drawer: overlay `fixed inset-0 z-40 bg-black/50 lg:hidden` + panel `fixed inset-y-0 left-0 z-50 w-64 bg-white p-4 shadow-lg` sliding from left, same nav structure as Sidebar (extract shared nav config to a local `const NAV_ITEMS: Record<UserRole, {to,label}[]> | navMap` module or a `navConfig.ts` under `frontend/src/components/layout/` — reuse in both Sidebar and MobileNav to avoid duplication; this is encouraged). Close on overlay click, Escape, and after navigating (on nav item click close). `aria-modal="true"` on drawer when open.

### DashboardLayout.tsx — `export function DashboardLayout(): JSX.Element`
`<div className="min-h-screen bg-gray-50">` containing `Sidebar` (desktop), `MobileNav` (in header), `Header`, and `<main className="lg:pl-64"><div className="p-4 sm:p-6 lg:p-8"><Outlet /></div></main>`. Sidebar is sticky/fixed at top: `fixed inset-y-0 left-0 z-30` and main gets the `lg:pl-64` offset. Uses `useAuth` implicitly via children; NOT a route guard itself (ProtectedRoute handles that).

### NotFoundPage.tsx — `export default function NotFoundPage(): JSX.Element`
Centered `min-h-screen flex items-center justify-center bg-gray-50` card with `404` display (`text-5xl font-bold text-gray-300`), title "Page not found" (`text-lg font-semibold text-gray-900`), message "The page you are looking for doesn't exist." (`text-sm text-gray-500`), and a `ButtonLink to="/"` "Back to home". Use `Card` + `ButtonLink`.

## Steps
1. Read spec + plan sections.
2. Create a shared `frontend/src/components/layout/navConfig.ts` exporting `export const NAV_ITEMS: Record<UserRole, { to: string; label: string }[]>` (and `export const roleLabel`) if you prefer — this removes Sidebar/MobileNav duplication. Keep it simple.
3. Create the 5 files per above.
4. Run (workdir `frontend`, in order): `npm run lint`, `npm run typecheck`, `npm run build`. Must all pass.
5. Write report to `C:\Users\91983\Desktop\VibeCoded\CSE_portal\.superpowers\sdd\frontend-implementation\reports\task-5-report.md`.

## Report back
1. Files created (paths).
2. Confirmation nav lists match the role configs exactly, DashboardLayout uses Outlet, Header has Change Password modal + sign out.
3. Verification output (lint/typecheck/build).
4. Any deviations with reasons.