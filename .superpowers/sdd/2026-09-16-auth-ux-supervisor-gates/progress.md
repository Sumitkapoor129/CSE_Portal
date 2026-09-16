# SDD ledger — plan: docs/superpowers/plans/2026-09-16-auth-ux-supervisor-gates.md

Base: b0148a3 (branch feature/auth-ux-supervisor-gates)

## Preflight scan / Rulings (made before dispatch)

Ruling: backend Tasks 1-5 folded into ONE implementation agent — authController.ts is shared by T1+T2, studentController.ts by T3+T4+T5, types/index.ts by T2+T5, and the T3/T4/T5 test files depend at runtime on login returning accessToken (T2). Per-task agents would write-conflict or race in a single shared tree. — cost if wrong: one large agent instead of parallel backend agents; backend work is serial anyway.

Ruling: frontend folded into THREE implementation agents with disjoint file ownership:
- FE-α = T6 (client/context/types) + T11 (wizard; shares types/index.ts + api/student.ts domain)
- FE-β = T7+T8+T9 (all touch Header.tsx + auth pages/ui components)
- FE-γ = T10 (student pages only; disjoint from everything)
Per-feature agents on Header.tsx/types.ts would conflict in one tree. — cost if wrong: rework limited to UI files.

Ruling: parallel agents run ONLY read-only gates during the wave (`typecheck`, focused `test`). Controller runs `build`/`lint`/full `npm test` at integration to avoid concurrent vite dist + cache races in the shared frontend/ dir. — cost if wrong: an integration failure caught late, cheap to fix.

Ruling: implementation agents DO NOT commit and DO NOT run git add (shared index would race across 4 parallel agents). They edit+test+report; controller reviews diffs per agent (disjoint paths) then commits per bundle. — cost if wrong: controller holds the git actions; recovery clean since diff is per-agent path.

Ruling: docs task 12 deferred to its own agent AFTER implementation passes, so real test counts can be written.

## Integration edits (controller, made at review-prep)
- NavList.tsx: NAV_ITEMS[user.role] -> getNavItemsForRole(user) (needed for Complete Profile item; NavList was owned by no agent)
- AuthContext.reload: reload() now carries profilePhoto + isProfileComplete from /auth/me
- vite.config.ts: test include -> ['src/**/*.test.{ts,tsx}'] (Avatar.test.tsx was undiscoverable; flagged by fe-beta)

## Implementer reports (all DONE_WITH_CONCERNS)
- BE: 8 suites/33 tests pass, typecheck+build clean. Deviations: testApp.ts (app.ts auto-starts Atlas+port+interval on import), bcrypt-hash fix for plan's plaintext makeUser, deriveSemesterDates (Semester requires startDate/endDate), mongoose duplicate-index warning (plan-verbatim), backend lint broken repo-wide (pre-existing, not a plan gate).
- FE-α: client.test 6/6 + full suite 25/25, typecheck/build/lint clean. Fixed plan bug: refreshAccessToken used in-body finally so synchronous no-refresh path leaked refreshPromise forever; cleanup moved to post-assignment .finally().
- FE-β: errors 2/2, Avatar 2/2 (verified via transient config), typecheck/build/lint clean. Adapted Avatar.test.tsx (getByRole('img') can't find <img alt="">; jest-dom not installed) using toBeTruthy/getAttribute.
- FE-γ: 3 pages typecheck-clean, eslint clean.

## Gates (controller, post-integration)
- Backend: typecheck clean, build clean, jest 8 suites / 33 tests PASS.
- Frontend: typecheck clean, build clean, lint 0 errors (1 pre-existing react-hooks/exhaustive-deps warning in useApi.ts), vitest 9 files / 27 tests PASS (incl. Avatar.test.tsx discovered).