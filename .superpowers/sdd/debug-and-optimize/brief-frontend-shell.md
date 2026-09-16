# Frontend Fix Brief A — shared components, app shell, layout (FE-A)

Repo: `C:\Users\91983\Desktop\VibeCoded\CSE_portal`. You work ONLY in `frontend/src/`. All changes below are root-caused; implement them exactly as specified. Read each file before editing.

## Constraints
- Run `npm --prefix frontend run typecheck` — must pass (may produce pre-existing warnings).
- Run `npm --prefix frontend run lint` — must pass (1 pre-existing warning is acceptable; no new warnings/errors).
- Run `npm --prefix frontend test -- --run` — all 27 tests must pass. If any fail due to your changes, fix them.
- Do NOT run `npm run build` (FE-B also runs lint/typecheck; dist race).
- Do NOT commit, do NOT git add. Do NOT modify files outside your ownership set.
- Write your full report to `C:\Users\91983\Desktop\VibeCoded\CSE_portal\.superpowers\sdd\debug-and-optimize\report-frontend-shell.md`.

## Ownership (exactly these files)
- `src/hooks/usePageTitle.ts` (NEW)
- `src/App.tsx`
- `src/components/ui/Tabs.tsx`
- `src/components/ui/Modal.tsx`
- `src/components/ui/Skeleton.tsx`
- `src/components/ui/Alert.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/PasswordInput.tsx`
- `src/components/ui/Select.tsx`
- `src/components/student/DueDateCell.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/MobileNav.tsx`
- `src/components/layout/DashboardLayout.tsx`
- `src/components/shared/ProtectedRoute.tsx`
- `src/components/shared/ParticipantPicker.tsx`
- `src/pages/auth/LoginPage.tsx`
- `src/pages/auth/RegisterPage.tsx`
- `src/pages/auth/VerifyOtpPage.tsx`
- `src/pages/NotFoundPage.tsx`

## 1. `usePageTitle` hook — NEW `src/hooks/usePageTitle.ts`
Create `export const usePageTitle = (title: string): void => { useEffect(() => { document.title = title ? `${title} — CSE PhD Portal | NIT Jamshedpur` : 'CSE PhD Portal | NIT Jamshedpur'; }, [title]); }`. Brand string must match `index.html` title exactly: `CSE PhD Portal | NIT Jamshedpur`.

## 2. `src/App.tsx` — centralized page titles + BrowserRouter future flags
Read the file first to understand route structure. Add:
- `import { useEffect } from 'react'` (check if already imported) and `import { useLocation } from 'react-router-dom'`.
- Add a `DocumentTitle` component inside the Router: reads `useLocation().pathname`, maps to a title via a `ROUTE_TITLES` lookup + pattern fallbacks. Example pattern:
```ts
const ROUTE_TITLES: Record<string, string> = {
  '/login': 'Sign In',
  '/register': 'Register',
  '/verify-otp': 'Verify OTP',
  '/student/dashboard': 'Dashboard',
  '/student/courses': 'My Courses',
  '/student/credits': 'Credits',
  '/student/events': 'Events',
  '/student/documents': 'Documents',
  '/student/profile': 'Profile',
  '/student/deadlines': 'Deadlines',
  '/student/notifications': 'Notifications',
  '/supervisor/dashboard': 'Dashboard',
  '/supervisor/students': 'Assigned Students',
  '/supervisor/approvals': 'Approvals',
  '/supervisor/events': 'Events',
  '/supervisor/notices': 'Notices',
  '/admin/dashboard': 'Dashboard',
  '/admin/users': 'User Management',
  '/admin/faculty': 'Faculty Management',
  '/admin/students': 'Student Management',
  '/admin/courses': 'Course Management',
  '/admin/assignments': 'Supervisor Assignments',
  '/admin/deadlines': 'Deadline Management',
  '/admin/events': 'Event Management',
  '/admin/notices': 'Notice Management',
  '/admin/src-committee': 'SRC Committee',
  '/admin/forms': 'Form Builder',
  '/admin/thesis': 'Thesis Titles',
  '/admin/notifications': 'Notification Management',
  '/admin/audit': 'Audit Log',
};
function getRouteTitle(pathname: string): string { for (const [path, title] of Object.entries(ROUTE_TITLES)) { if (pathname === path || pathname.startsWith(path + '/')) return title; } if (pathname === '/dashboard') return 'Dashboard'; if (pathname === '/') return ''; return ''; }
```
- Mount `<DocumentTitle />` as the first child inside `<Routes>`.
- On `<BrowserRouter>`, add `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}` (React Router v7 compat flags; reduces console warnings).

## 3. `src/components/ui/Tabs.tsx` — ARIA tabs pattern
Read the file. Root cause: no `role="tablist"`, no `id`/`aria-controls` linking, no `role="tabpanel"`.
Fix:
- The tab list wrapper: add `role="tablist"`.
- Each tab button: `id={`tab-${value}`}`, `role="tab"`, `aria-selected={active === value}`, `aria-controls={`tabpanel-${value}`}`.
- The content wrapper: `role="tabpanel"`, `id={`tabpanel-${active}`}`, `aria-labelledby={`tab-${active}`}`, `tabIndex={0}`.
- Ensure keyboard support already exists (left/right arrow handlers — verify).
- Keep all existing props and API identical; only ARIA wiring changes.

## 4. `src/components/ui/Modal.tsx` — background inert for screen readers
Read the file. Root cause: screen readers can reach content behind the open modal (no `aria-hidden`/`inert`).
Fix:
- When `isOpen` is true, set `aria-hidden="true"` and `inert` on the app root's direct children EXCEPT the portal. Since Modal portals to `document.body`, the simplest robust approach: add a `useEffect` that, on open, sets `document.getElementById('root')?.setAttribute('aria-hidden', 'true')` + `inert` (these are mutually exclusive but both help different ATs); on close or unmount, remove both.
- Also ensure the `<div className="modal-backdrop">` has `aria-hidden="true"` (it's decorative).
- Keep `onClose` (Escape), body overflow lock, and click-outside behavior as-is.

## 5. `src/components/ui/Skeleton.tsx` — loading announcement
Read the file. Root cause: `role="status"` announces nothing.
Fix: inside each element with `role="status"`, add a visually-hidden `<span className="sr-only">Loading…</span>` as the first child. Keep existing props/styling.

## 6. `src/components/ui/Alert.tsx` — correct ARIA roles
Read the file. Root cause: `role="alert"` always fires a live-region interrupt, even for success/info.
Fix:
- `variant === 'error'`: keep `role="alert"` + `aria-live="assertive"`.
- `variant === 'success'` or `'info'`: use `role="status"` + `aria-live="polite"`.
- `variant === 'warning'`: use `role="alert"` + `aria-live="polite"` (important but not an emergency).

## 7. Error text contrast — `Input.tsx`, `PasswordInput.tsx`, `Select.tsx`
Root cause: `text-red-600` (≈4.5:1) fails WCAG AA on white (needs 4.5:1 minimum, red-600 is borderline; red-700 is safely above).
Fix in all three files: change `text-red-600` (error text only) to `text-red-700`. Keep `text-red-500` border color as-is (borders don't need text contrast). Read each file to locate the error text element.

## 8. `src/components/student/DueDateCell.tsx` — due-today contrast
Root cause: `text-amber-600` ≈ 3.5:1 on white.
Fix: change `text-amber-600` to `text-amber-700` for the "Due today" text only.

## 9. `src/components/layout/Header.tsx` — mobile trigger accessibility
Root cause: unlabeled hamburger, missing `aria-haspopup`.
Fix (mobile trigger button, around lines 154-175):
- Add `aria-label="Navigation menu"`.
- Add `aria-haspopup="menu"`, `aria-expanded={isMobileMenuOpen}`.
- On the mobile dropdown panel (lines ~191-211): add `id="mobile-menu"` and `role="menu"`.
- On each nav item link inside the panel: add `role="menuitem"`.
- Connect trigger to panel: add `aria-controls="mobile-menu"` on the trigger.

## 10. `src/components/layout/MobileNav.tsx` — breathing room
Root cause: cramped padding vs Sidebar.
Fix: change the nav container's padding from `p-4` to `px-5 py-4` (or equivalent that adds a bit more horizontal space). Read the file; only change padding.

## 11. `src/components/layout/DashboardLayout.tsx` — skip link
Root cause: skip link uses `text-sm` (too small, sudden size jump).
Fix: change `focus:text-sm` to `text-base` (or remove the focus size override entirely, keep as `text-base font-medium` consistently). Keep `sr-only focus:not-sr-only` pattern. Verify the existing ID targets exist in the page structure.

## 12. `src/components/shared/ProtectedRoute.tsx` — loading announcement
Root cause: "Loading..." text not announced to screen readers.
Fix: wrap the loading JSX (spinner + "Loading...") in `<div role="status" className="sr-only">Loading…</div>` and keep the visual spinner as-is (don't remove the visual feedback). Or: add the `role="status"` and `aria-live="polite"` to the existing loading container and add a `<span className="sr-only">` with the text.

## 13. `src/components/shared/ParticipantPicker.tsx` — fieldset
Root cause: checkbox group not wrapped in a semantic fieldset.
Fix: wrap the "Students" section checkbox list in `<fieldset>` + `<legend className="text-sm font-medium">Students</legend>`. Keep existing layout. If there's also a "Faculty" section, wrap that separately with its own legend.

## 14. Auth pages — `<main>` landmark
Root cause: no `<main>` wrapper; screen readers can't jump to content.
Fix in EACH of `LoginPage.tsx`, `RegisterPage.tsx`, `VerifyOtpPage.tsx`:
- Wrap the outermost content `<div>` (the one with `className="min-h-screen ...`) in `<main className="...">` using the same classes, and close `</main>` at the end. Keep the existing outer div's classes on the `<main>`. Or: if the outermost div already has `className="min-h-screen flex items-center justify-center..."`, change `<div ...>` to `<main ...>` and `</div>` to `</main>`. Read each file to decide.

## 15. `src/pages/NotFoundPage.tsx` — heading size + main landmark
Root cause: `text-5xl` is too large (overwhelming for an error page), and no `<main>`.
Fix:
- Change `<div>` wrapping the "404" to `<main>`.
- Reduce `text-5xl` to `text-4xl`.

## Report
Write to the report file path above: summary, per-item status (done / deviation), test output summary, and any concerns. Return to me: one-line status, test counts, and any concerns.
