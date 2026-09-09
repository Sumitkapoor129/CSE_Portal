# Task 10 Brief: Routing completion, lazy loading, and polish

Full plan: `docs/superpowers/plans/2026-09-08-frontend-implementation.md` (lines 1978–2003)

IMPORTANT REPO RULES:
- This repo has NO git. Do NOT run any git commands. Skip the plan's commit step.
- Work from repo root `C:\Users\91983\Desktop\VibeCoded\CSE_portal`. All code under `frontend/`.
- NEVER add code comments. No emoji. Professional/minimal/classy. No gradients/glows. Only `animate-pulse` (+ minimal `transition-colors`).
- Full literal Tailwind class strings only.
- Run npm commands with workdir `frontend` (PowerShell — chain with `; if ($?) { ... }`).

## Context
- All 24 pages already exist and are wired in `frontend/src/App.tsx` (Tasks 6–9). Auth pages: `LoginPage`, `RegisterPage`, `VerifyOtpPage`. All others: student (10), supervisor (5), admin (9).
- Reusable UI: `Skeleton` (`components/ui/Skeleton.tsx`), `Alert` (`components/ui/Alert.tsx`), `Button` (`components/ui/Button.tsx`).

## Goal
Make the non-auth routes load lazily, wrap rendered routes in `Suspense` + an `ErrorBoundary`, and keep the auth pages eager (critical path).

## Work

### 1. Create `frontend/src/components/shared/ErrorBoundary.tsx`
Small class component. Props `{ children: React.ReactNode }`. State `{ hasError: boolean }`.
- `static getDerivedStateFromError()` → `{ hasError: true }`.
- Renders children normally when no error; when errored, render a centered friendly panel: title "Something went wrong" (`text-lg font-semibold text-gray-900`), message "An unexpected error occurred. Please try again." (`text-sm text-gray-500`) in a `Card`, plus a `Button` "Reload page" that calls `window.location.reload()`.
- NO technical/error messages shown to users. `componentDidCatch` optional (needed? only if you want to log — do NOT add console noise; skip it unless lint demands). Class property initializers are fine (TS target ES2020 + `useDefineForClassFields`).
- Default export AND named export.

### 2. Modify `frontend/src/App.tsx`
- Convert ALL non-auth page imports to lazy: `const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'))` etc. `LoginPage`, `RegisterPage`, `VerifyOtpPage` stay as static imports.
- Root: wrap the `<Routes>` in the `ErrorBoundary`.
- Wrap the routed content in `Suspense`: `<ErrorBoundary><Suspense fallback={<Skeleton className="h-64 w-full" />}><Routes>...</Routes></Suspense></ErrorBoundary>` (Suspense must be INSIDE `AuthProvider`/`BrowserRouter` and can wrap the `Routes`; the auth pages being eager means the Suspense fallback only appears for lazy chunks).
- Keep the exact same route tree as currently present in `App.tsx` (student 10, supervisor 5, admin 9, auth 3, `/`, `*`). DO NOT reorder or drop routes.
- Named exports note: pages export BOTH default and named (`export default StudentDashboard`). `lazy(() => import('./pages/student/StudentDashboard'))` will resolve the module's default — confirm each page has a default export (Task implementers added them; verify with grep if unsure, and if a file lacks a default export add `export default <Component>` — do NOT remove the named export).
- `Root()` unchanged.

### 3. `frontend/src/index.html` — polish only if needed
Keep title "CSE PhD Portal | NIT Jamshedpur", ensure `lang="en"` + meta description exist. No functional changes required.

## Verification
Run (workdir `frontend`, in order):
```
npm run lint
npm run typecheck
npm run build
npm test
```
All pass. `npm run build` output should now show MULTIPLE JS chunks (lazy code-splitting is real — confirm in the build output listing, e.g. several `index-*.js` asset files, not a single monolithic bundle). Report the chunk count and total gzip size.

## Report back
1. Files created/modified (paths).
2. Confirmation: auth pages eager, all other pages lazy; ErrorBoundary wraps Routes; Suspense fallback = Skeleton; route tree unchanged (count routes).
3. Build output: number of JS chunks + total gzip size (before was ~98 kB gzip single chunk).
4. Verification output (lint/typecheck/build/test).
5. Any deviations with reasons. Confirm no git commands run.