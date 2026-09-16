# Backend Fix Brief — correctness, security, and performance (BE-FIX)

Repo: `C:\Users\91983\Desktop\VibeCoded\CSE_portal`. You work ONLY in `backend/`. All changes below are root-caused; implement them exactly as specified. Read each file before editing.

## Constraints
- Run `npm --prefix backend run test` (Jest; mongodb-memory-server binary is already cached, ~3 min) and make ALL tests pass, including new ones you add.
- Run `npm --prefix backend run typecheck` and `npm --prefix backend run build` — both must pass.
- Do NOT commit, do NOT git add. Do NOT modify files outside `backend/`.
- Do not break the current API response shapes.
- Write your full report to `C:\Users\91983\Desktop\VibeCoded\CSE_portal\.superpowers\sdd\debug-and-optimize\report-backend-fix.md`.

## 1. Security defaults — `src/config/env.ts`
Root cause: `JWT_SECRET` falls back to literal `'fallback_secret_change_me'` and `ADMIN_PASSWORD` to `'admin123'` — forging + known seeded admin without `.env`.
Fix: enforce at module load, ONLY when `env.NODE_ENV === 'production'` (leave dev/test fallbacks so tests and local dev work):
- throw `Error('JWT_SECRET must be set in production')` when JWT_SECRET unset or === 'fallback_secret_change_me'.
- throw `Error('ADMIN_PASSWORD must be set in production')` when ADMIN_PASSWORD unset or === 'admin123'.
- Add `CORS_ORIGINS: process.env.CORS_ORIGINS || ''`.
- Remove misleading unused keys `JWT_EXPIRES_IN` and `JWT_REFRESH_SECRET` ONLY after confirming nothing reads them (`rg "JWT_EXPIRES_IN|JWT_REFRESH_SECRET" backend/src`). If something reads them, leave them.
Also update `backend/.env.example` to document `CORS_ORIGINS` (comma-separated) and drop now-removed keys if present.

## 2. Deactivated users must not refresh — `src/utils/tokens.ts`
Root cause: `refreshUseCase` mints new tokens for deactivated users; admin deactivation toggle is a no-op.
Fix: in `refreshUseCase`, after `User.findById(doc.user)`, if `!user.isActive`, `await doc.deleteOne()` and return `{ ok: false, reason: 'invalid' }`.

## 3. JWT verify algorithm pinning — `src/middleware/auth.ts`
Fix: in the verify call, pass `{ algorithms: ['HS256'] }` as the options arg to `jwt.verify`. Read the file first; keep behavior identical otherwise.

## 4. 4xx classification for client errors — `src/middleware/errorHandler.ts`
Root cause: Mongoose CastError (bad ObjectId, wrong types) and plain `Error`s surface as 500.
Fix:
- Before the final 500 fallback, if `err.name === 'CastError'` respond `400 { message: 'Invalid id or value format' }`.
- Replace direct `process.env.NODE_ENV` reads with `env.NODE_ENV` from `../config/env`.
- Keep AppError branch as-is.

## 5. Milestone service error types — `src/services/milestoneService.ts`
Root cause: `updateMilestone` throws plain `Error` for invalid status / not-found.
Fix: import `AppError` from `../middleware/errorHandler`; throw `AppError('Milestone not found', 404)` and `AppError(\`Invalid status: ${updates.status}\`, 400)`.

## 6. CORS — `src/app.ts`
Root cause: `cors({ origin: '*', credentials: true })` is an invalid combination that breaks cross-origin auth.
Fix: replace with `cors({ origin: env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',').map(s => s.trim()) : true, credentials: true })`. Add a graceful interval stop in `shutdown`: `clearInterval` the scheduler interval (keep a handle), then `process.exit(0)`. Keep everything else.

## 7. Deadline semester field type — `src/models/Deadline.ts` AND `src/types/index.ts`
Root cause: `Deadline.semester` is `ObjectId ref 'Semester'` but the product semantics + UI are a *semester number* ("target all students in their N-th semester"); the scheduler queries a nonexistent field.
Fix:
- `models/Deadline.ts`: `semester: { type: Number }` (optional). Keep `student` as ObjectId ref.
- `types/index.ts`: change `IDeadline.semester` to `number` (optional) in the same shape as other optional fields.
- Add `deadlineSchema.index({ notificationSent: 1, dueDate: 1 })`.

## 8. Semester-scoped deadline scheduler bug + serialization — `src/services/deadlineService.ts`
Root causes: (a) `Semester.find({ semester: deadline.semester })` queries a field that does not exist; (b) per-user `await` loop = O(n) sequential round-trips + SMTP in the request path.
Fix — rewrite `checkDeadlines` inner loop:
- Student-scoped (`deadline.student`): one profile id.
- Semester-scoped (`deadline.semester`): `Semester.find({ semesterNumber: deadline.semester }).select('student').lean()` → collect distinct profile ids.
- Global: `StudentProfile.find({}).select('_id user')` as today.
- Resolve profile ids → user ids with ONE query: `StudentProfile.find({ _id: { $in: profileIds } }).select('user')` (only needed for ids without a known user).
- Build the full user id set (dedupe).
- Notifications: `createBulkNotifications(userIds, { title, message, type: 'deadline', link: '/student/deadlines' })` (import from `../utils/notify`). Increment `notif` by userIds.length.
- Emails: ONE `User.find({ _id: { $in: userIds } }).select('email').lean()`, then `await Promise.allSettled(...)` over `sendNotificationEmail` calls. Increment `emails` per successful send.
- Then `Deadline.updateOne` to set `notificationSent: true`.
- Keep the try/catch returning `{ error }` on failure and the top-level `{ checked, notif, emails }` return.
- Keep `formatDate` and `DatedDeadline` shape (update `semester?: number` in the interface to match).

## 9. Refactor token store — `src/models/RefreshToken.ts`
Root cause: duplicate unique index (field-level `unique: true` + `schema.index`) → Mongoose startup warning.
Fix: keep field-level `unique: true` on `tokenHash`; DELETE the `schema.index({ tokenHash: 1 }, { unique: true })` line. Keep `{ user: 1, expiresAt: 1 }`, and ADD a TTL index `refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })` so stale sessions are evicted by Mongo.

## 10. Missing indexes
- `src/models/StudentCourse.ts`: add `schema.index({ student: 1, status: 1 })` (hottest unindexed aggregation path).
- `src/models/Event.ts`: add `index({ organizer: 1, date: 1 })` and `index({ 'participants.participant': 1, date: 1 })`.

## 11. Participant resolution N+1 — `src/utils/participants.ts`
Root cause: `resolveUserIds` loops id-by-id with 2 queries per id.
Fix:
- `resolveUserIds`: batch — `const users = await User.find({ _id: { $in: ids } }).select('role').lean()`; collect `_id` where role==='student'; then `const remaining = ids.filter(id => !matchedUserIds.has(id))`; `StudentProfile.find({ _id: { $in: remaining } }).select('user').lean()` → add each `profile.user`. Return unique ids. Only run the second query if `remaining.length > 0`.
- Add export `getAssignedStudentUserIds(supervisorUserId: string): Promise<Set<string>>` — reuse `getEligibleStudentOptions` (it returns `userId` strings) and return the set of `userId`s. (This powers the supervisor invite gate.)

## 12. `src/controllers/supervisorController.ts`
Root causes / fixes:
- **createEvent invite gate**: after `resolveParticipants`, fetch `const allowed = await getAssignedStudentUserIds(req.user!.id)`; if any userId in `userIds` is NOT in `allowed`, throw `AppError('Cannot invite a student who is not assigned to you', 403)`. Then replace the serial notify/email loop: `createBulkNotifications(userIds, { title: 'New Event: '+title, message, type: 'event_invitation', link: '/student/events' })`, then one `User.find({_id:{$in:userIds}}).select('email').lean()` and `await Promise.allSettled(userDocs.map(u => sendNotificationEmail(u.email, 'New Event: '+title, message)))`. Keep the audit log.
- **getAssignedStudents name-search pagination** (lines ~116-153): root cause is filter-after-page. Fix: when `name` is present, first `User.find({ name: { $regex: escapeRegex(name), $options: 'i' } }).select('_id').lean()`, then intersect: `filter.user = { $in: matchedUserIds }` (StudentProfile has a `user` field). Remove the populate-`match` hack and the post-`skip/limit` client filter entirely. Use `escapeRegex(name)` for rollNumber/researchArea too. `total` must now be `countDocuments(filter)` with the name filter applied (it already is — just ensure `filter` includes the user match).
- **getStudentDetail**: add `.populate('supervisor', 'employeeId department designation')` alongside the `coSupervisor` populate (line ~172).
- **getDashboard**: wrap the four count calls + Supervisor find in `Promise.all`.
- Import `createBulkNotifications` from `../utils/notify`, `getAssignedStudentUserIds` from `../utils/participants`, and `escapeRegex` (see #14).
- **approveCourse / approveThesis / approveRequest**: replace the two `User.find`→student-profile lookups with a single `StudentProfile.findById(...).populate('user','name')` already present; leave logic (they are correct) — do NOT change behavior.

## 13. `src/controllers/adminController.ts`
Root causes / fixes:
- **createDeadline** (line ~774): accept `semester` from body; if provided, coerce `Number(semester)` and validate `Number.isInteger(n) && n >= 1`, else `AppError('semester must be a positive integer', 400)`; pass the number to `Deadline.create`.
- **createEvent** (line ~528): same bulk-notify + `Promise.allSettled` email refactor as supervisor's (#12). Admin may invite anyone (no gate needed).
- **updateSRCCommittee** (line ~496): root cause — update bypasses the create-time invariants (exactly one chairperson; supervisor member matches the student's assigned supervisor). Extract the member validation used in `createSRCCommittee` into a helper (e.g. `validateSRCMembers(members, studentId)`) inside this file and call it from BOTH create and update (in update, load `committee.student`). Keep error messages identical to create's.
- **listStudents / listFaculty / globalSearch regex abuse**: add a small `escapeRegex(input: string)` helper (see #14) and wrap ALL `$regex` values built from user input. Cap `search`/`q`/`name` length to 100 chars.
- **Compact picker payloads**: `listStudents` and `listFaculty` should accept an optional `fields` query param (comma list). When present: project to those fields (plus `user`) and `.lean()`. Keep the `user` populate as `'name email'`. (Frontend will send `fields` — contract: `?fields=rollNumber,department,studentType`.)
- Do not change `globalSearch` response shape.

## 14. Regex escaping util
Create `backend/src/utils/query.ts` exporting `export const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');`. Import where used (items 12, 13).

## 15. `src/controllers/studentController.ts` — dashboard parallelism
Read `getDashboard` (lines ~437-509). Root cause: ~10 sequential queries. Refactor the independent reads (deadlines, events, thesis, unread notifications, pending course requests, credits aggregate, milestones) into `Promise.all` where no data dependency exists (semester id resolution first if needed — check whether dashboard resolves semesters; keep response `data` shape EXACTLY identical; the frontend depends on it). Use `.lean()` on read-only fetches in this function where it cannot change behavior. Run the full backend test suite after.

## 16. `src/controllers/authController.ts` — slim `/auth/me`
Read `getMe` (near line ~154) and `buildUserPayload` (lines ~15-27). Root cause: the student profile is fetched twice and a heavy populated profile is returned while `AuthContext.reload()` only needs light fields.
Fix: in `buildUserPayload`, accept an optional already-fetched `profile` argument and reuse it instead of re-querying. In `getMe`, fetch the profile ONCE (with whatever populates it currently needs — check), pass it to `buildUserPayload`. Keep the `/auth/me` response data shape identical to what the frontend reads (`id, name, email, role, profilePhoto, isProfileComplete`). Verify against `frontend/src/api/auth.ts` and `frontend/src/context/AuthContext.tsx` — do not change what they consume. (You may read those frontend files for the contract only; do not edit them.)

## 17. Dev log hygiene — `src/utils/email.ts`
Root cause: full email body (incl. OTP) printed to console in dev, and dev logs are piped to files.
Fix: when `!env.SMTP_USER` log only destination + subject (`[EMAIL] To: ... | Subject: ...`); drop the body line. Re-check `refreshTokens`/`authErrors` tests — if any test asserts on the body log output, adjust the test expectation to the new single-line format instead of reverting the code.

## 18. Restore backend lint — new `backend/eslint.config.js` + package.json script
Root cause: ESLint 9 flat config mandatory; no config exists and `--ext` is invalid.
Fix:
- Add `backend/eslint.config.js` (ESLint 9 flat config) using `@eslint/js` recommended + `typescript-eslint` parser/plugin. To keep the gate usable without stylistic noise on this legacy codebase, disable/noisy-relax: `@typescript-eslint/no-explicit-any: 'off'`, `@typescript-eslint/no-unused-vars` as `warn`, `no-undef: 'off'` (TS), `no-unused-vars: 'off'` (replaced), `@typescript-eslint/explicit-module-boundary-types: 'off'`, `@typescript-eslint/no-var-requires: 'off'`. Files: ignore `dist/`. Do not add rules that produce errors on the current code.
- `backend/package.json`: change `"lint": "eslint src --ext .ts"` → `"lint": "eslint src"`.
- Run `npm --prefix backend run lint` and confirm exit 0 (may need to fix a small number of genuine errors it surfaces — fix them).
- Ensure typecheck/build/tests still pass.

## 19. Test coverage (add + keep green)
- `src/__tests__/testApp.ts`: also mount `supervisorRoutes` and `adminRoutes` (`import ... from '../routes/supervisorRoutes'` etc). This makes many previously untestable routes reachable.
- `src/__tests__/refreshTokens.test.ts`: add a test — a DEACTIVATED user (isActive:false) calling the refresh endpoint gets a reject/invalid result and the session is revoked. Follow the existing test patterns in that file (read it first).
- `src/__tests__/deadlineService.test.ts`: add a test for the semester-scoped branch — create 2 student users + profiles, only one with a `Semester` doc `{ semesterNumber: 2 }`, create a `Deadline` for `semester: 2`, run `checkDeadlines`, assert only the semester-2 student got a notification. Read the existing file to mirror its DB setup/cleanup style.
- `src/__tests__/supervisorGate.test.ts`: add a cross-supervisor denial test — supervisor B (with a valid FacultyProfile + Supervisor assignment to a DIFFERENT student) cannot approve the first student's course (expect 403). Read the file first; it currently uses a fake faculty id without a Supervisor doc, so you may need to create real docs. Keep existing tests passing.

## Report
Write to the report file path above: summary (what changed), per-item status (done / deviation + why), test results (`npm run test`, typecheck, build, lint output summaries), and any concerns. Return to me: one-line status, commit-free confirmation, test counts, and concerns.