# Auth & UX Feature Set — Design

CSE PhD Scholar Management Portal (CSE_portal)

Date: 2026-09-16

## Goal

Implement eight requested features across the Express/TS backend (`backend/`) and the React frontend (`frontend/`): clearer auth error messages, show-password toggle, sequential semester creation, supervisor-required academic actions, responsive logout, sidebar identity (name + photo), a post-registration onboarding wizard, and refresh/access token sessions for RBAC.

## Decisions (user-approved)

1. **F8 tokens:** access + refresh tokens both stored in `localStorage` (same storage pattern as today). Access token short-lived (15 min), refresh token long-lived (7 days, single-use with rotation).
2. **F6/F7 photo:** photo is a **URL only**. No file upload endpoint, no multer. Feature is about *displaying* the photo everywhere it is currently missing and collecting a photo URL in onboarding.
3. **F7 onboarding fields (standard set):**
   - Personal: photo URL (optional), date of birth, gender, blood group, category
   - Academics: last degree, institution, graduation year, qualification (CGPA/score)
   - Contact: phone, address, research area

## Global constraints

- Follow existing conventions: backend `new Schema<any>` pattern, `AppError` from `src/middleware/errorHandler.ts`, `AuthRequest` from `src/types/index.ts`, frontend Tailwind v4 utilities, `cn()` helper, no comments in source, no emoji in UI.
- RBAC roles unchanged: `student`, `supervisor`, `admin`. `authenticate`/`authorize` remain the guards.
- Response envelope unchanged: `{ success: true, data }` / `{ message }`.
- Feature branch: `feature/auth-ux-supervisor-gates`. Never commit directly to `main`.
- Run backend gates from repo root: `npm run typecheck`, `npm run build`, `npm test`. Frontend gates from `frontend/`: `npm run typecheck`, `npm run build`, `npm run lint`, `npm test`.

---

## F1 — Auth errors that explain what went wrong

Backend returns field-targeted, human-readable errors:

- `AppError` gains optional `fields?: Record<string, string>`. `errorHandler` passes `fields` through in the JSON body.
- `login`:
  - email not found → `401` `No account found with this email.` with `fields.email`
  - wrong password → `401` `Incorrect password. Please try again.` with `fields.password`
  - inactive account → `403` `Account not verified. Please verify your email first.` (existing)
- `register`:
  - each missing/format-invalid field → `400` with per-field map
  - duplicate email → `409` `An account with this email already exists. Try logging in.` with `fields.email`
- `verifyOTP`: missing → `400`; unknown email → `404`; already verified → `400`; bad OTP → `400` `Invalid or expired OTP. Check and try again.` with `fields.otp`.

Frontend maps `fields` onto the matching input and surfaces the message instead of a generic string.

## F2 — Show/hide password

New `PasswordInput` component (wraps `Input`, eye toggle, `aria-label`, focus-safe). Used in login, register, change-password modal, onboarding wizard.

## F3 — Sequential semester creation

`studentController.createSemester` computes the expected number from the student's newest semester (`last + 1`, or `1` if none) and rejects any other value with `400` `Semester {n} cannot be added. Next semester is {expected}.` plus `fields.semesterNumber`. Existing duplicate `409` stays. Frontend shows the next semester as read-only text; no manual number input.

## F4 — No academic actions without a supervisor

`studentController` guard: if `profile.supervisor` is not set, throw `403` `{Action} requires an assigned supervisor.` Applied to `submitThesis`, `addCourse`, `uploadDocument`. Frontend: on the Thesis and Courses pages, when the fetched profile has no supervisor, hide the action buttons and show a notice.

## F5 — Responsive logout + identity in sidebar

- Header dropdown is constrained to the viewport (`w-56` → `max-w-[calc(100vw-2rem)]`), right-aligned, so Sign out / Change password are reachable on small screens.
- Sidebar and MobileNav replace the `PhD Scholar Portal / NIT Jamshedpur` brand block with the current user's avatar, full name, and role.

## F6 — Profile photo visible

- Backend: `login`, `register`, and `me` include `profilePhoto` (and student `isProfileComplete`) on the returned user object, read from the profile doc.
- New `Avatar` component (photo → fallback to initials). Used in Header, Sidebar, MobileNav, StudentProfile (view + edit URL), supervisor StudentDetail, admin Student/Faculty lists.
- `AuthUser` gains optional `profilePhoto` / `isProfileComplete`.

## F7 — Step-wise onboarding after registration

- `StudentProfile` gains: `dateOfBirth`, `gender`, `bloodGroup`, `category`, `phone`, `address`, `lastDegree`, `institution`, `graduationYear`, `qualification`.
- `isProfileComplete` is recomputed by `studentController.updateProfile` from a required-field set.
- New wizard page `/student/complete-profile`: 3 steps (Personal → Academics → Contact), single submit at the end via `PUT /student/profile`. Reached via a banner on the student dashboard when incomplete, and from the Profile nav.

## F8 — Refresh + access tokens

- New env vars: `JWT_ACCESS_EXPIRES_IN` (15m), `JWT_REFRESH_EXPIRES_IN` (7d). New `JWT_REFRESH_SECRET` fallback: `JWT_SECRET`.
- Access token: JWT signed with `{ id, role, email, type: 'access' }`, short expiry. `authenticate` verifies `type === 'access'`; refresh tokens are rejected there.
- Refresh token: opaque 32-byte random string; sha256 hash stored in a new `RefreshToken` model (`{ user, tokenHash, expiresAt }`, hashed unique index). Single-use.
- `POST /auth/refresh` (body `{ refreshToken }`): validate + rotate (delete old, issue new) + new access token. `POST /auth/logout` (body `{ refreshToken }`): deletes the hash.
- `login` / `register` return `{ accessToken, refreshToken, user }`.
- Frontend: store both in localStorage (`cse_portal_token`, `cse_portal_refresh`). `apiFetch` on `401` does a single-flight silent refresh then one retry; on refresh failure clears tokens and dispatches `auth:unauthorized`. AuthContext login/logout updated; `logout` best-effort calls `POST /auth/logout`.

## Testing

- Backend jest (mongodb-memory-server): auth error shapes, semester sequencing, supervisor gate, refresh rotation/reuse/expiry, access-token-only middleware.
- Frontend vitest: client refresh-retry, updated auth + client suites.
- Full gates: backend `typecheck`/`build`/`test`; frontend `test`/`typecheck`/`build`/`lint`.
- Mandatory reviewers per AGENTS.md for frontend work: aesthetic, performance, code-quality, accessibility.