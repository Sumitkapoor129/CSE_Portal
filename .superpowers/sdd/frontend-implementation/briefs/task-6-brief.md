# Task 6 Brief: Auth pages + initial routing

Full plan: `docs/superpowers/plans/2026-09-08-frontend-implementation.md` (lines 1472–1551)
Design spec: `docs/superpowers/specs/2026-09-08-frontend-design.md` (Auth pages section)

IMPORTANT REPO RULES:
- This repo has NO git. Do NOT run any git commands. Skip the plan's commit step.
- Work from repo root `C:\Users\91983\Desktop\VibeCoded\CSE_portal`. All code under `frontend/`.
- NEVER add code comments. No emoji. Professional/minimal/classy. No gradients/glows. Only `animate-pulse` allowed (plus minimal `transition-colors`).
- Full literal Tailwind class strings only.
- TDD optional here (plan has no test step for this task) — verification is `npm run lint` + `npm run typecheck` + `npm run build`.

## Context — available modules
- `frontend/src/context/AuthContext.tsx`: `useAuth()` → `{ user, initializing, login, logout, reload }`; `AuthProvider`.
- `frontend/src/api/auth.ts`: `authApi` with `login`, `register(payload)`, `verifyOtp(email, otp)`.
- `frontend/src/api/client.ts`: `setStoredToken`.
- UI primitives at `frontend/src/components/ui/`: `Button`, `Input`, `Select`, `Card`, `Alert`, plus `frontend/src/components/shared/PageHeader.tsx`.
- `frontend/src/components/layout/DashboardLayout.tsx` and `frontend/src/components/shared/ProtectedRoute.tsx` already exist.
- Register POST body (backend): `{ email, password, name, collegeId, rollNumber, studentType: 'frp'|'erp', department }`. Register returns `{ token, user, message }` but the token is for an INACTIVE account — do NOT store it as a session. After register, redirect to `/auth/verify-otp` with email in location state. verify-otp returns `{ message }` — NO token. User must log in after verifying.
- No forgot/reset password routes on the backend — do NOT add a forgot-password link (documented backend gap).

## Files

### 1. `frontend/src/pages/auth/LoginPage.tsx`
Centered card layout (`flex min-h-screen items-center justify-center bg-gray-50 px-4`; card `w-full max-w-md rounded-lg border border-gray-200 bg-white p-8`; heading `text-xl font-semibold text-gray-900`; sub `mt-1 text-sm text-gray-500`). Fields: email, password. Submit → `login(email, password)` → `navigate('/', { replace: true })` (the Root redirect in App.tsx sends by role). Show server error in `Alert variant="error"` above form. Loading state disables submit button. Link at bottom: `New student? Register` → `navigate('/auth/register')` — rendered as a `Link to="/auth/register"`. No forgot-password link.
If a user is ALREADY logged in, redirect away (e.g., `if (user) return <Navigate to="/" replace />`).
`export function LoginPage(): JSX.Element`.

### 2. `frontend/src/pages/auth/RegisterPage.tsx`
Same centered card layout. Fields: name, email, password (min 8, show error), collegeId, rollNumber, studentType (Select with options `frp` = "Full-time (FRP)", `erp` = "External (ERP)"), department. Client-side validation with `required`/`validateEmail` from `frontend/src/utils/validators.ts` (field-level errors on Input `error` prop). On success → success Alert "Verification OTP sent to your email." and `navigate('/auth/verify-otp', { state: { email } })` (keep alert visible on the verify page too). Server error shown in error Alert. Link back: `Already registered? Login`.
`export function RegisterPage(): JSX.Element`.

### 3. `frontend/src/pages/auth/VerifyOtpPage.tsx`
Centered card. Email input prefilled from `useLocation().state?.email ?? ''`. OTP input (6-digit, inputMode="numeric"). Submit → `verifyOtp(email, otp)`. On success → success Alert "Account activated. Please log in." + primary button `Go to login` → `navigate('/auth/login')`. Resend note is NOT implemented (no backend route) — do not add one. Server error in error Alert.
`export function VerifyOtpPage(): JSX.Element`.

### 4. Modify `frontend/src/App.tsx`
Exact full routing shell:
```tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { VerifyOtpPage } from './pages/auth/VerifyOtpPage';
import { NotFoundPage } from './pages/NotFoundPage';

function Root() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth/login" replace />;
  if (user.role === 'student') return <Navigate to="/student" replace />;
  if (user.role === 'supervisor') return <Navigate to="/supervisor" replace />;
  return <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/verify-otp" element={<VerifyOtpPage />} />
          <Route
            element={
              <>
                <ProtectedRoute />
                <DashboardLayout />
              </>
            }
          >
            {/* student / supervisor / admin routes added in Tasks 7–9 */}
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```
Type note: `ProtectedRoute` returns `JSX.Element | null`; rendering it inside a fragment before `DashboardLayout` mirrors a guard-and-layout wrapper — this compiles because the fragment is a valid `ReactNode` element slot. If TypeScript complains about the fragment-as-element expecting a `path`-less layout route, keep the fragment approach exactly as specified (react-router accepts element fragments for layout routes; if `tsc` errors, wrap as the plan shows and report it).

## Steps
1. Create the 3 auth pages.
2. Replace `frontend/src/App.tsx` with the routing shell.
3. Run (workdir `frontend`, in order): `npm run lint`, `npm run typecheck`, `npm run build`. Must all pass. Fix causally if not (never weaken configs).
4. Write report to `C:\Users\91983\Desktop\VibeCoded\CSE_portal\.superpowers\sdd\frontend-implementation\reports\task-6-report.md`.

## Report back
1. Files created/modified (paths).
2. Confirmation: no token stored after register; redirect flow login→"/"→Root role-redirect; verify-otp success flow; no forgot-password link.
3. Verification output (lint/typecheck/build).
4. Any deviations with reasons.