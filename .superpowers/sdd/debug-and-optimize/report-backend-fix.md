# Backend Fix Report — correctness, security, and performance (BE-FIX)

Branch: `feature/debug-and-optimize`
Scope: `backend/` only. No commits, no `git add` performed.

## Summary

Implemented all 19 items in the brief. Baseline was 8 suites / 33 tests passing. Final: **8 suites / 36 tests passing** (3 new tests added). `typecheck`, `build`, `lint`, and `test` all pass.

## Per-item status

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Security defaults — `src/config/env.ts` | done | Enforce `JWT_SECRET`/`ADMIN_PASSWORD` only when `NODE_ENV === 'production'`; added `CORS_ORIGINS`; removed unused `JWT_EXPIRES_IN`/`JWT_REFRESH_SECRET` (grep confirmed nothing reads them). Updated `.env.example`. |
| 2 | Deactivated users must not refresh — `src/utils/tokens.ts` | done | `refreshUseCase` now deletes session + returns `{ ok: false, reason: 'invalid' }` when `!user.isActive`. |
| 3 | JWT algorithm pinning — `src/middleware/auth.ts` | done | `jwt.verify(..., { algorithms: ['HS256'] })`. |
| 4 | 4xx classification — `src/middleware/errorHandler.ts` | done | CastError → 400 `Invalid id or value format`; replaced `process.env.NODE_ENV` with `env.NODE_ENV` from `../config/env`; AppError branch unchanged. |
| 5 | Milestone service error types — `src/services/milestoneService.ts` | done | `AppError('Milestone not found', 404)` and `AppError(\`Invalid status: ...\`, 400)`. |
| 6 | CORS — `src/app.ts` | done | `cors({ origin: env.CORS_ORIGINS ? split/trim : true, credentials: true })`. Scheduler interval handle captured in `startDeadlineScheduler`, kept on the `start` scope; `shutdown` still calls `process.exit(0)`. |
| 7 | Deadline semester field — `models/Deadline.ts` + `types/index.ts` | done | `Deadline.semester` → `Number` (optional), `IDeadline.semester` → `number | undefined`, added `{ notificationSent: 1, dueDate: 1 }` index. |
| 8 | Semester-scoped scheduler + serialization — `src/services/deadlineService.ts` | done | Rewrote inner loop per brief: one-shot profile id collection, `Semester.find({ semesterNumber })` for semester-scoped, bulk notifications via `createBulkNotifications`, single `User.find` + `Promise.allSettled` for emails. `DatedDeadline.semester?: number`. Return shape unchanged (`{ checked, notif, emails }` / `{ error }`). |
| 9 | RefreshToken model — `models/RefreshToken.ts` | done | Removed duplicate unique index on `tokenHash`; kept `{ user: 1, expiresAt: 1 }`; added TTL index on `expiresAt` (`expireAfterSeconds: 0`). |
| 10 | Missing indexes | done | `StudentCourse`: `{ student: 1, status: 1 }`; `Event`: `{ organizer: 1, date: 1 }` and `{ 'participants.participant': 1, date: 1 }`. |
| 11 | Participant resolution N+1 — `utils/participants.ts` | done | `resolveUserIds` batch via `User.find({ _id: { $in } })` + one `StudentProfile.find` for remaining; only runs 2nd query when `remaining.length > 0`. Added `getAssignedStudentUserIds`. |
| 12 | `src/controllers/supervisorController.ts` | done | createEvent invite gate (`getAssignedStudentUserIds`, 403) + bulk notify + `Promise.allSettled` emails; name search now regex-first + `filter.user $in` (removed populate-match hack and post-skip client filter); `total` = `countDocuments(filter)` with name applied; `getStudentDetail` populates `supervisor`; `getDashboard` counts + supervisor find parallelized; `escapeRegex` used for rollNumber/researchArea/name; approve* handlers behavior unchanged (notification calls retained). |
| 13 | `src/controllers/adminController.ts` | done | createDeadline coerces/validates `semester` (positive integer) else 400; admin createEvent bulk-notify + `Promise.allSettled` emails; SRC member validation extracted to `validateSRCMembers(members, studentId)` used by both create & update (identical messages; create loads the student profile via the helper and sets `srcCommittee` via `findByIdAndUpdate`); `escapeRegex` + 100-char cap on search/q; `listStudents`/`listFaculty` accept `fields` comma param (select + lean, `user` populated `name email`); `globalSearch` shape unchanged. |
| 14 | Regex escaping util | done | Created `backend/src/utils/query.ts` exporting `escapeRegex`. |
| 15 | `src/controllers/studentController.ts` dashboard parallelism | done | Independent reads (currentSemester, credits, milestones, deadlines, events, pending course requests, thesis, unread notifications) now in one `Promise.all`; `.lean()` added on read-only fetches; semester-ids resolution hoisted above; `data` shape preserved exactly. |
| 16 | `src/controllers/authController.ts` slim `/auth/me` | done | `buildUserPayload` accepts optional pre-fetched `profile`; `getMe` fetches profile once and reuses it. Response `data` shape (`id, name, email, role, profilePhoto, isProfileComplete, isActive, profile`) unchanged; verified against `frontend/src/api/auth.ts` and `AuthContext.tsx`. |
| 17 | Dev log hygiene — `src/utils/email.ts` | done | Dev path logs only `[EMAIL] To: ... | Subject: ...`; body line removed. No test asserted on the body log. |
| 18 | Restore backend lint | done | Added flat `backend/eslint.config.js` (`@eslint/js` + `typescript-eslint`, noisy rules relaxed, `dist/` ignored) and `"lint": "eslint src"`. Installed `typescript-eslint` (`npm install -D typescript-eslint`) — this was **deviation #1** (required dep, brief implied it but it was not installed). |
| 19 | Test coverage | done | `testApp` mounts `supervisorRoutes` + `adminRoutes`; new refresh test (deactivated user, session revoked); new semester-scoped deadline test; new cross-supervisor denial test with real FacultyProfile/Supervisor docs + second student (Supervisor.student is unique, so supervisor B is assigned to a *different* student). |

## Deviations from the brief

1. **`npm install -D typescript-eslint`** — required for item 18's flat config. The package was not present in `node_modules` and not in `package.json`; the brief said deps "shouldn't" need installs, but this one was genuinely missing. No other packages were installed.
2. **SRC committee create uses `findByIdAndUpdate`** to set `studentProfile.srcCommittee` (item 13) — the original inline `studentProfile` variable was moved into the extracted `validateSRCMembers` helper, so the create flow updates the field via a targeted update instead of load+save. Behavior (setting `srcCommittee`) is identical.
3. **Removed `const profile2 =` lint warning** in the new semester-scope test (kept the `StudentProfile.create` call, dropped the unused assignment) so no new lint warnings were introduced.
4. Brief item 8 returned per-user `emails` counting on send success; final version counts only fulfilled `Promise.allSettled` emails (as prescribed by the brief itself). No change from brief.

## Test / verification results

- `npm --prefix backend run typecheck` — **PASS** (clean)
- `npm --prefix backend run build` — **PASS** (clean)
- `npm --prefix backend run lint` — **PASS**, exit 0, **0 errors, 15 warnings** (all pre-existing `@typescript-eslint/no-unused-vars` warnings, `warn` severity by design)
- `npm --prefix backend run test` — **PASS**, 8 suites / **36 tests** (baseline 33 + 3 new)
  - refreshTokens 5/5 (new: deactivated-user refresh denied + session revoked)
  - deadlineService 6/6 (new: semester-scoped only targets matching semester)
  - supervisorGate 4/4 (new: cross-supervisor course approval → 403)
  - profileFields, authErrors, semesterSequence, creditService, milestoneService all pass

One pre-existing ESLint runtime warning: `eslint.config.js` parsed as an ES module (no `type: "module"` in package.json). Non-fatal; can be silenced by setting `type: "module"` in `backend/package.json`, but that risks affecting the CommonJS build output, so it was left as-is.

## Concerns

- `backend/eslint.config.js` module-type warning (see above): benign for lint, but if the team wants it gone they must weigh `"type": "module"` against the CommonJS `tsc` emit.
- The scheduler interval in `app.ts` is held in the module/start scope; `process.exit(0)` still terminates immediately on signal, so the interval reference is largely documentation-grade. No behavior change.
- `Supervisor.student` is `unique` at the schema level, which limits one active supervisor record per student; the cross-supervisor test reflects the real data model (B is assigned to a different student).