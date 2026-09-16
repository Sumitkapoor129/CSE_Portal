# Backend Implementation Report — Auth & UX / Supervisor Gates

**Date:** 2026-09-16
**Branch context:** feature/auth-ux-supervisor-gates (changes left uncommitted for controller review)
**Plan:** `docs/superpowers/plans/2026-09-16-auth-ux-supervisor-gates.md` (Backend Tasks 1-5)

---

## Summary

Implemented all five backend tasks (F1, F8 backend, F3, F4, F7 backend) in TDD
order per the plan. Each task: wrote failing test(s) → confirmed RED → implemented
→ confirmed GREEN. Full backend gate green: `npm run typecheck`, `npm run build`,
`npm test` (8 suites / 33 tests) all pass and jest exits cleanly.

---

## Task 1 — F1 Structured auth errors (`AppError.fields` + messages)

**Files changed**
- `backend/src/middleware/errorHandler.ts` — `AppError` gains optional 3rd arg
  `fields?: Record<string, string>`; `errorHandler` spreads `fields` into the AppError
  JSON response when present.
- `backend/src/controllers/authController.ts` — rewrote `registerStudent`, `login`,
  `verifyOTP` error paths with plan-exact messages + field maps (unknown-email 401,
  wrong-password 401, duplicate email 409, missing-fields 400, OTP validation 400).
- `backend/src/__tests__/authErrors.test.ts` — created (plan verbatim test bodies).

**TDD evidence**
- RED: `6 failed` — failures like
  `Expected substring: "No account found with this email"` / `Received string: "Invalid credentials"`,
  `Received: undefined` (no `fields` on responses).
- GREEN: `Test Suites: 1 passed`, `Tests: 6 passed`.

---

## Task 2 — F8 Access + refresh token sessions (backend)

**Files changed (created)**
- `backend/src/config/env.ts` — added `JWT_ACCESS_EXPIRES_IN` ('15m'),
  `JWT_REFRESH_EXPIRES_IN` ('7d'), `JWT_REFRESH_SECRET` (fallback to `JWT_SECRET`).
- `backend/src/models/RefreshToken.ts` — created (plan verbatim: `user`, `tokenHash`,
  `expiresAt`, timestamps, unique index + compound index).
- `backend/src/types/index.ts` — added `IRefreshToken`.
- `backend/src/utils/tokens.ts` — created: `hashToken`, `generateAccessToken` (payload +
  `type: 'access'`), `msFromEnv`, `createRefreshSession`, `revokeRefreshToken`,
  `refreshUseCase` (rotation: deletes old doc, issues new refresh + access).
- `backend/src/middleware/auth.ts` — removed `generateToken`; `authenticate` now
  rejects tokens with `type !== 'access'`; kept `export { authenticate, authorize }`
  (definitions changed to plain `const` so the re-export line is not a TS redeclaration).
- `backend/src/controllers/authController.ts` — login/register return
  `{ accessToken, refreshToken, user }`; added `refreshToken` and `logout` handlers;
  added `buildUserPayload` (profile photo + student `isProfileComplete`, F6 fold-in);
  `getMe` restructured to spread `buildUserPayload`, then `isActive` + `profile`.
- `backend/src/routes/authRoutes.ts` — registered `POST /refresh`, `POST /logout`.
- `backend/.env.example` — added the three new env vars.
- `backend/src/__tests__/refreshTokens.test.ts` — created (plan test bodies).

**TDD evidence**
- RED: `4 failed` — `Cannot read properties of undefined (reading 'accessToken')`
  (login still returned old `token` shape).
- GREEN: `Tests: 4 passed` (login pair, rotation/replay rejected, logout invalidation,
  refresh-token rejected as access token).

**Type fixes required to satisfy `strict` (kept plan behavior)**
- `tokens.ts` `msFromEnv`: indexed access on the lookup returned `number | undefined`
  (TS18048). Narrowed index to `match[2] as 's' | 'm' | 'h' | 'd'` (regex already
  constrains the suffix).
- `buildUserPayload` `profile?.isProfileComplete`: profile is a StudentProfile |
  FacultyProfile union; FacultyProfile has no `isProfileComplete` (TS2339). Cast the
  union member: `(profile as { isProfileComplete?: boolean } | null)?.isProfileComplete`.

---

## Task 3 — F3 Sequential semester creation

**Files changed**
- `backend/src/controllers/studentController.ts` — after the existing duplicate check in
  `createSemester`, added the plan-exact sequence check
  (`lastSemester + 1` expected; 400 + `semesterNumber` field otherwise).
- `backend/src/__tests__/semesterSequence.test.ts` — created (plan test bodies).

**TDD evidence**
- RED (after runner fix): `3 failed` — `Expected: 400, Received: 500`,
  `Expected: 201, Received: 500`.
- GREEN: `Tests: 3 passed`.

**Deviation required (documented):** the plan sends only `{ semesterNumber,
academicYear }` and expects 201, but the existing `Semester` model (not in my owned
file list, left untouched) declares `startDate`/`endDate` as `required`. The plan's
snip only added the sequence check and did not change creation. To satisfy the plan's
own mandated test (bare creation → 201), `createSemester` now supplies default dates
when absent via a new `deriveSemesterDates(academicYear)` helper (Aug 1 → Jul 31 of the
parsed academic year, with a now/now+1y fallback). Explicit `startDate`/`endDate` in the
request still win. This is the minimal change that makes the feature actually usable.

---

## Task 4 — F4 Supervisor required for academic actions

**Files changed**
- `backend/src/controllers/studentController.ts` — added plan-exact
  `requireAssignedSupervisor(profile, action)` helper; called after profile fetch in
  `addCourse` ('Requesting a course'), `submitThesis` ('Submitting a thesis'),
  `uploadDocument` ('Uploading a document'); throws 403 when `profile.supervisor` unset.
- `backend/src/__tests__/supervisorGate.test.ts` — created (plan test bodies).

**TDD evidence**
- RED: `2 failed` — `Expected: 403, Received: 201` for course + thesis without supervisor.
- GREEN: `Tests: 3 passed` (blocks course, blocks thesis, allows course with supervisor).

---

## Task 5 — F7 Student profile fields + `isProfileComplete`

**Files changed**
- `backend/src/models/StudentProfile.ts` — added `dateOfBirth`, `gender`, `bloodGroup`,
  `category`, `phone`, `address`, `lastDegree`, `institution`, `graduationYear`,
  `qualification` (plan verbatim schema lines).
- `backend/src/types/index.ts` — added the same fields (optional) to `IStudentProfile`.
- `backend/src/controllers/studentController.ts` — `updateProfile` now accepts the
  `editable` field list, coerces `dateOfBirth` to `Date`, and recomputes
  `isProfileComplete` from `REQUIRED_PROFILE_FIELDS`
  (researchArea, phone, address, lastDegree, institution, graduationYear, dateOfBirth).
- `backend/src/__tests__/profileFields.test.ts` — created (plan test bodies).

**TDD evidence**
- RED: `Test suite failed to run` — TS2339 `Property 'bloodGroup' does not exist` /
  `Property 'phone' does not exist` on the profile document type.
- GREEN: `Tests: 2 passed` (fields persist + incomplete stays false; complete set → true).

---

## Test-infrastructure adaptation (IMPORTANT — report to controller)

The plan's backend test files import `app from '../app'`. In this repo, `backend/src/app.ts`
**auto-starts on import**: it calls `start()` which runs `connectDB()` (→ real Atlas URI
from `backend/.env`), `seedAdmin()`, `startDeadlineScheduler()` (a 6-hour `setInterval`),
and `app.listen(5000)`. Running the plan's tests against it caused:

1. `MongooseError: Can't call openUri() on an active connection with different
   connection strings` — app already connected mongoose to Atlas before the test's
   in-memory `mongoose.connect`.
2. Jest never exited (open HTTP server + interval), hanging the run until the shell
   timeout — so the required `npm test` gate could never pass.
3. Risk of pointing tests at (and `deleteMany`-ing data from) the real production
   MongoDB Atlas database.

Because `app.ts`/`jest.config.js`/`package.json` are not in my owned file list, I could
not fix the runner within scope (that is a pre-existing architectural issue: the app
should export an app without side effects, or gate `start()` behind
`require.main === module`). I therefore created one extra file **and** changed only the
import lines in the 5 new test files:

- **Created** `backend/src/__tests__/testApp.ts` — a test-only Express app that wires
  the exact same production modules I own and that these endpoints use:
  `express.json()`, `authRoutes`, `studentRoutes`, `errorHandler`. No auto-start, no
  real DB, no port binding, no interval; supertest spins up ephemeral servers per
  request and jest exits cleanly.
- **Changed** `import app from '../app'` → `import { testApp as app } from './testApp'`
  in all 5 new test files. Test bodies/assertions are otherwise identical to the plan.

Second extra per-test deviation: the plan's `refreshTokens.test.ts` `makeUser()` stores a
**plaintext** password; `login` uses `bcrypt.compare`, so login always 401s
(verified: `bcrypt.compare('secret123','secret123') === false`). Changed it to hash with
`bcrypt.hash('secret123', 12)` (same pattern the plan's own F1 test uses). Data/assertions
unchanged — the feature-under-test is token pairing, not hashing.

Third deviation: `supervisorGate.test.ts` setup creates a `Semester` directly via the
model without `startDate`/`endDate`; the model requires them. Added the two dates to that
`Semester.create` call (create-via-model is not the F3 endpoint, so no defaults apply).

---

## Existing-test migration

None required. The three existing suites (`creditService`, `deadlineService`,
`milestoneService`) do not exercise `/api/auth/login` or the old `token` response shape —
grep confirmed `generateToken` was referenced only by `middleware/auth.ts` and
`authController.ts`, both updated in Task 2. All three existing suites still pass.

---

## Full verification (final gate)

- `npm run typecheck` (backend): **clean**
- `npm run build` (backend): **clean**
- `npm test` (backend): **8 suites passed, 33 tests passed** (3 existing + 5 new), exits
  cleanly.
- `npm run lint` (backend): **fails repo-wide, pre-existing** — ESLint 9 has no
  `eslint.config.js` in the repo (`ESLint couldn't find an eslint.config.(js|mjs|cjs) file`).
  Not one of my required gates and not in my owned files to fix; flagging for the controller.

---

## Self-review findings

- **GH2:** Devs should not omit valid indices. The `RefreshToken` schema uses the plan's
  verbatim combination of field-level `unique: true` AND `schema.index({tokenHash:1},
  {unique:true})`, producing a harmless `Duplicate schema index on {"tokenHash":1}`
  Mongoose warning on every run. Left verbatim per the plan's "use values verbatim"
  instruction; consider dropping one in a follow-up to silence the warning.
- `getMe` now runs an extra profile query via `buildUserPayload` (plan-mandated). Acceptable.
- `buildUserPayload` returns `isProfileComplete` only for students (plan-mandated). The
  frontend `AuthUser` type gains `profilePhoto?`/`isProfileComplete?` in the frontend stub
  (other agent).
- `refreshToken`/`logout` are unauthenticated routes by design (rotation-based session).
- No backend source comments added. No file-upload endpoints or invented routes/fields.
- `deriveSemesterDates` is the only invented behavior; it is small, isolated, and required
  for the plan's own tests to pass against the current `Semester` model (see Task 3 note).

---

## Concerns

1. **`app.ts` import side effects** — pre-existing and will break any future test that
   imports it (Atlas connection + port + interval). Recommend the controller add a
   `require.main === module` guard (out of scope here).
2. **`refreshTokens.test.ts` plan bug** — plaintext `makeUser` password; fixed to
   bcrypt-hash in test.
3. **`Semester` required dates vs plan test** — compensated in controller
   (`deriveSemesterDates`). If the controller prefers, the model could relax `required`
   on dates instead; that file was outside my scope.
4. **Lint broken repo-wide** (missing ESLint flat config) — pre-existing, not mine.
5. **Mongoose duplicate-index warning** on `RefreshToken.tokenHash` — cosmetic.

## Files changed (backend only)

- Modified: `middleware/errorHandler.ts`, `controllers/authController.ts`, `config/env.ts`,
  `middleware/auth.ts`, `controllers/studentController.ts`, `models/StudentProfile.ts`,
  `routes/authRoutes.ts`, `types/index.ts`, `.env.example`
- Created: `models/RefreshToken.ts`, `utils/tokens.ts`, `__tests__/authErrors.test.ts`,
  `__tests__/refreshTokens.test.ts`, `__tests__/semesterSequence.test.ts`,
  `__tests__/supervisorGate.test.ts`, `__tests__/profileFields.test.ts`,
  `__tests__/testApp.ts` (test-only app helper)

## Commits

None — per instructions, all changes left uncommitted for the controller to commit/review.