# SDD ledger — plan: whole-codebase debug + optimize (ad-hoc controller pass)

Base: b6924f0 (branch feature/debug-and-optimize)

## Context
- Codebase: CSE_portal (NIT Jamshedpur PhD Scholar Mgmt). Backend Express+TS+Mongo, frontend React 19+Vite+TS+Tailwind v4.
- Baseline (controller-verified on b6924f0): backend typecheck ✅ build ✅ jest 8 suites/33 tests ✅; frontend typecheck ✅ build ✅ vitest 9 files/27 tests ✅; frontend lint 1 pre-existing warning (useApi.ts exhaust-deps spread).
- Known baseline observations: (1) Mongoose duplicate index warning on RefreshToken.tokenHash; (2) frontend tsbuildinfo committed to git; (3) backend has NO ESLint config (lint broken repo-wide); (4) React Router v7 future-flag warnings in tests; (5) `npm run dev` needs real MongoDB (not installed locally).

## Agent dispatch — review phase (created 16 Sep 2026)
4 read-only review agents dispatched in parallel, scoped per AGENTS.md:
- Code Quality (full stack)
- Performance / Latency (full stack)
- Aesthetic / UX (frontend)
- Accessibility (frontend)

## Rulings (16 Sep 2026)
- `Deadline.semester` → Number (semantic match + scheduler fix)
- Orphaned ApprovalRequest feature: parked as documented limitation
- User enumeration on login: parked as documented deliberate decision
- env fail-fast: production-only (not test); test mode keeps fallbacks to avoid breaking jest
- CORS fix: env-driven `CORS_ORIGINS` allowlist; `origin: true` for dev; credentials:true kept

## Agent dispatch — fix phase (16 Sep 2026)
3 implementation agents dispatched in parallel (disjoint file ownership):
- BE-FIX: backend correctness, security, performance (`backend/`)
- FE-A: shared components + app shell + layout + auth pages (`frontend/src/` — shared/ui, hooks, layout, auth, ProtectedRoute, ParticipantPicker)
- FE-B: admin/supervisor/student pages + constants + api (`frontend/src/` — all page components, constants.ts, api/admin.ts)