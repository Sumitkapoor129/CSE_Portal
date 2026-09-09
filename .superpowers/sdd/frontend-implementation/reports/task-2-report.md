# Task 2 Report: Core domain types, API client, and utilities

Date: 2026-09-09
Agent: implementation subagent (Task 2)
Brief: `.superpowers/sdd/frontend-implementation/briefs/task-2-brief.md`

## Status

All steps complete. `npm test`, `npm run lint`, `npm run typecheck`, `npm run build` all pass.

## Files created

### Test files (written first, per TDD)

1. `frontend/src/api/client.test.ts` (jsdom env pragma)
2. `frontend/src/utils/formatDate.test.ts`
3. `frontend/src/utils/validators.test.ts`

### Source files (implemented after RED confirmed)

4. `frontend/src/types/index.ts`
5. `frontend/src/api/client.ts`
6. `frontend/src/utils/formatDate.ts`
7. `frontend/src/utils/constants.ts`
8. `frontend/src/utils/validators.ts`

## RED -> GREEN proof

### RED (before implementation)

`npm test` -> 3 failed suites, all module-resolution failures:

- `Failed to resolve import "./client" from "src/api/client.test.ts". Does the file exist?`
- `Cannot find module './formatDate' imported from '...formatDate.test.ts'`
- `Cannot find module './validators' imported from '...validators.test.ts'`

Result: `Test Files 3 failed | 1 passed (4)`, `Tests 1 passed (1)`.

### Intermediate (after implementation, before minimal fixes)

Modules resolved, but 3 brief-vs-test conflicts surfaced:

- `apiFetch appends query params`: received `search=a+b`, expected `search=a%20b`
- `daysUntil returns positive days for future date`: received 4, expected 3
- `required rejects empty and blank values`: `required(0)` returned true, expected false

### GREEN (after minimal fixes)

`Test Files 4 passed (4)`, `Tests 14 passed (14)`:

- `src/__tests__/setup.test.ts` (1 test)
- `src/utils/validators.test.ts` (4 tests)
- `src/utils/formatDate.test.ts` (5 tests)
- `src/api/client.test.ts` (4 tests)

## Verification output

- `npm test` -> 4 files passed, 14 tests passed.
- `npm run lint` -> clean (no output, exit 0).
- `npm run typecheck` -> clean (no output, exit 0).
- `npm run build` -> `tsc -b && vite build` succeeded; 29 modules transformed; dist emitted (`index-D1ki-i1j.js` 194.77 kB / gzip 60.95 kB).

## jsdom install confirmation

`npm install -D jsdom@^25` executed in Task 2 (per brief's known environment note). `frontend/package.json` devDependencies now contains `"jsdom": "^25.0.1"` (line 27). 57 packages added, audit clean of errors (2 moderate vulnerabilities unrelated pre-existing).

## Deviations from the brief (causal fixes, type safety preserved)

The brief's source code contradicted its own tests in 3 places. Per instructions, verification failure was fixed minimally in source (tests untouched, no config/type weakened):

1. `src/api/client.ts` — `URLSearchParams.set` percent-encodes space as `+`, but the test asserts `search=a%20b`. Replaced loop over `url.searchParams.set(...)` with manual `encodeURIComponent(key)=encodeURIComponent(String(value))` joined by `&`, assigned via `url.search`. Produces RFC 3986 `%20` encoding, matching the test.

2. `src/utils/formatDate.ts` — `daysUntil` computed `Math.ceil((new Date(value).getTime() - midnightNow) / 86400000)`. A time-of-day offset makes a "now + 3 days" target yield 3.018 -> ceil -> 4. Normalized the target to midnight (`target.setHours(0, 0, 0, 0)`) before division so the difference is an exact multiple of a day; result is exactly 3 for the test case.

3. `src/utils/validators.ts` — `required(0)` returned `true` (0 is truthy-checked as `0 !== undefined && 0 !== null`), but the test expects `false`. Rewrote as: explicit early return `false` for `undefined`/`null`; strings trimmed non-empty; otherwise `Boolean(value)` (so `0` -> false, `4` -> true, `'x'` -> true).

All other 11 tests passed unmodified against the brief's implementation. No weakening of strict TS (tsconfig untouched) or lint configs.

## Notes

- No git commands run (repo deliberately has no git).
- No code comments added. No emoji.
- 401 handling clears the stored token and dispatches `auth:unauthorized` CustomEvent; it does not mutate `window.location` (verified by `client.test.ts`).
- No runtime-constructed Tailwind class names (all status style class strings are full literals in `constants.ts`).
- `jsdom@^25.0.1` installed ahead of plan order per the brief's known environment note (required by `client.test.ts`'s jsdom env pragma).

## Report path

`.superpowers/sdd/frontend-implementation/reports/task-2-report.md`