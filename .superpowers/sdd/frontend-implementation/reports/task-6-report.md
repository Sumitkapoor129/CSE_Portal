# Task 6 Report: Auth pages + initial routing shell

## Files created/modified

| Action | Path |
|--------|------|
| Created | `frontend/src/pages/auth/LoginPage.tsx` |
| Created | `frontend/src/pages/auth/RegisterPage.tsx` |
| Created | `frontend/src/pages/auth/VerifyOtpPage.tsx` |
| Replaced | `frontend/src/App.tsx` |
| Modified (named export added) | `frontend/src/pages/NotFoundPage.tsx` |

## Auth flow confirmation

- **Register → verify-otp**: `RegisterPage` calls `authApi.register()` but never stores the returned token (inactive account token). On success it navigates to `/auth/verify-otp` passing `email` via `location.state`.
- **Verify-otp → login**: `VerifyOtpPage` prefills email from `location.state.email`. After successful `authApi.verifyOtp()` it shows success alert "Account activated. Please log in." and a `Go to login` button — no token is stored. User must log in separately.
- **Login → `/` → role redirect**: `LoginPage` calls `login(email, password)` then navigates to `/`. The `Root` component in `App.tsx` reads `user.role` from `useAuth()` and redirects to `/student`, `/supervisor`, or `/admin` accordingly.
- **Already-logged-in guard**: `LoginPage` returns `<Navigate to="/" replace />` if `user` is already set.
- **No forgot-password link**: Confirmed absent from `LoginPage` (backend has no such route).

## Verification output

```
npm run lint        → PASS (0 errors, 1 pre-existing warning in hooks/useApi.ts)
npm run typecheck   → PASS (clean)
npm run build       → PASS (56 modules, 75.69 KB gzipped JS, 4.65 KB gzipped CSS)
```

## Deviations from brief

1. **NotFoundPage export style**: The brief's App.tsx imports `{ NotFoundPage }` (named import), but the existing component only had a default export. Added a named export to `NotFoundPage.tsx` (keeping the default export for backward compatibility) rather than altering the App.tsx routing shell, since the routing shell is specified verbatim in the brief. This is a minimal, non-breaking change.

No other deviations.

## Git

No git commands were run. Confirmed.
