# Report — Frontend Fix Brief A (FE-A): shared components, app shell, layout

## Summary

**STATUS: PASS**
- Typecheck: PASS (clean)
- Lint: PASS — 0 errors, 1 pre-existing warning (`src/hooks/useApi.ts:36` `react-hooks/exhaustive-deps`), unchanged
- Tests: 9 files / 27 tests passed (no build run, per constraint)

All 15 brief items were implemented. No commits or `git add` were made. No files outside the ownership set were modified.

## Per-item status

| # | File(s) | Status | Notes |
|---|---------|--------|-------|
| 1 | `src/hooks/usePageTitle.ts` (new) | done | Exact brand string `CSE PhD Portal | NIT Jamshedpur` verified against `index.html:7`. |
| 2 | `src/App.tsx` | done (deviation) | Added `DocumentTitle` (via `useLocation` + `usePageTitle`), mounted as first child of `<Routes>`, and added `future={{ v7_startTransition, v7_relativeSplatPath }}`. **Deviation:** the brief's example `ROUTE_TITLES` keyed to non-existent paths (`/login`, `/student/dashboard`, `/admin/users`, etc.). Keyed the same titles to the app's real paths (`/auth/login`, `/student`, `/admin/students`, ...). `/student/complete-profile`, `/admin/forms`, `/admin/search`, `/supervisor/events` also added for full coverage. |
| 3 | `src/components/ui/Tabs.tsx` | done (deviation) | Added `id`, `role="tab"`, `aria-selected`, `aria-controls` to tab buttons; `role="tablist"` + arrow/Home/End keyboard support were already present (verified). **Deviation:** Tabs renders only the tab list — there is no content wrapper in this component (content is rendered by the consuming page, e.g. `StudentDeadlines`). `role="tabpanel"`/`aria-labelledby` markup lives on page-owned wrappers (FE-B), so tabpanel wiring could not be applied here without changing the public API. |
| 4 | `src/components/ui/Modal.tsx` | done (deviation) | Added `useEffect` that sets `aria-hidden="true"` + `inert` on `#root` while open (removed on close/unmount). **Deviation 1:** this Modal did NOT portal to `document.body` (it rendered in place); the brief's premise assumed a portal. Since inert-ing `#root` while the modal is a descendant of `#root` would hide the modal itself, added `createPortal(..., document.body)` to align with the brief's intended architecture. **Deviation 2:** did NOT add `aria-hidden="true"` to the backdrop div — in this component the backdrop is the *container* of the dialog panel, so `aria-hidden` would hide the dialog content from assistive tech. Dialog remains accessible via `role="dialog"` + `aria-modal="true"`, now backed by root inert/aria-hidden. Escape, body overflow lock, and click-outside behavior preserved. |
| 5 | `src/components/ui/Skeleton.tsx` | done | `<span className="sr-only">Loading…</span>` as first child inside both `role="status"` containers. |
| 6 | `src/components/ui/Alert.tsx` | done | error → `role="alert"`+`aria-live="assertive"`; warning → `role="alert"`+`aria-live="polite"`; success/info → `role="status"`+`aria-live="polite"`. |
| 7 | `Input.tsx` / `PasswordInput.tsx` / `Select.tsx` | done | Error text `text-red-600` → `text-red-700` in all three; red-500 border classes untouched. |
| 8 | `src/components/student/DueDateCell.tsx` | done | `text-amber-600` → `text-amber-700` on the overdue-count "Due today" text. |
| 9 | `Header.tsx` / `MobileNav.tsx` | done (deviation) | The brief's line numbers target the mobile hamburger + dropdown panel, which in this codebase live in `MobileNav.tsx` (Header renders `<MobileNav/>` at line 150). Applied the fix to the actual mobile nav: trigger now has `aria-label="Navigation menu"`, `aria-haspopup="menu"`, `aria-expanded`, `aria-controls="mobile-menu"`; panel has `id="mobile-menu"`. **Deviation 1:** the panel keeps `role="dialog"`+`aria-modal="true"` rather than `role="menu"` — the panel contains non-menuitem content (user identity, Close button), so a menu role would be semantically incorrect. **Deviation 2:** `role="menuitem"` on nav links was not applied — links are rendered by `src/components/layout/NavList.tsx`, which is outside FE-A ownership. Needs to be done by FE-B or a follow-up. |
| 10 | `src/components/layout/MobileNav.tsx` | done | Nav container padding `p-4` → `px-5 py-4`. |
| 11 | `src/components/layout/DashboardLayout.tsx` | done | Skip link: `text-base font-medium` always on; removed `focus:text-sm`. `id="main"` target verified present. |
| 12 | `src/components/shared/ProtectedRoute.tsx` | done | Loading container now `role="status"` + `aria-live="polite"`. (Brief also suggested an sr-only span; the visible "Loading…" text is already announced via the live region, so no duplicate was added.) |
| 13 | `src/components/shared/ParticipantPicker.tsx` | done (deviation) | Checkbox group wrapped in `<fieldset>` + `<legend className="text-sm font-medium">Students</legend>` per the brief. Only one section exists (no Faculty section). **Deviation:** legend replaces the previous `label` span; visible text changes from default "Participants" to "Students". Both callers (`EventManagement.tsx`, `SupervisorEvents.tsx`) pass students only, so "Students" is accurate. |
| 14 | `LoginPage.tsx` / `RegisterPage.tsx` / `VerifyOtpPage.tsx` | done | Outermost `min-h-screen` div changed to `<main>` in all three. |
| 15 | `src/pages/NotFoundPage.tsx` | done | Wrapper div → `<main>`; `text-5xl` → `text-4xl`. |

## Verification output

- `npm --prefix frontend run typecheck` → **pass** (no errors)
- `npm --prefix frontend run lint` → **pass** (1 pre-existing warning in `src/hooks/useApi.ts:36`; 0 errors)
- `npm --prefix frontend test -- --run` → **9 files passed, 27 tests passed**

## Concerns

1. **Concurrent FE-B edits** — while implementing, the working tree was being modified concurrently by FE-B. During the middle of the work, `FacultyManagement.tsx`, `StudentDetail.tsx`, `StudentOnboarding.tsx`, `StudentCourses.tsx`, and `StudentCredits.tsx` transiently failed typecheck (unused imports / JSX-in-string-header). These are all FE-B-owned page files and are now resolved (final `tsc -b --noEmit` is clean). They were never caused by FE-A changes and were not touched by FE-A.
2. `role="menuitem"` on the mobile nav links and tabpanel ARIA wiring are the only brief items not fully applied, both because the relevant markup lives in files outside FE-A's ownership set (`NavList.tsx`, and page-level tab content). Recommend FE-B coordinate on both.
3. React Router future-flag warnings still appear in `protected-routes.test.ts` stderr — that test uses `MemoryRouter` without the future flags. Harmless (tests pass), but a follow-up could add the flags there for a clean stderr.