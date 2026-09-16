# Accessibility Audit Report — CSE_portal Frontend

**Scope:** read-only code inspection of `frontend/src` (Tailwind v4 + React Router).
**Auditor:** Accessibility Reviewer subagent.
**Passed gates (baseline):** typecheck / build / tests / lint.
**Date:** 2026-09-16

---

## Overall verdict

The application has an unusually strong accessibility foundation for a code-inspection audit: global `:focus-visible` rings, a skip link wired to `#main`, `aria-labelledby` dialogs with focus traps and focus return, roving-tabindex tab stops with Home/End support, `aria-describedby`+`role="alert"` field errors, `scope="col"` table headers, `aria-current` pagination, and correct `autocomplete` on all auth screens. No Critical blockers were found — every form control is labeled and every interactive element is keyboard operable. The gaps cluster in four areas: (1) no per-route `document.title` updates, (2) an incomplete WAI-ARIA tabs pattern, (3) a handful of text-contrast failures in `gray-400`/`amber-600`/`red-600`, and (4) wizard/trigger focus-management gaps (onboarding steps, desktop-header menu trigger, modals not making background inert). All are mechanical fixes with no architectural risk.

---

## Findings

| # | Severity | Location | WCAG criterion | Issue | Fix |
|---|----------|----------|----------------|-------|-----|
| 1 | Important | `index.html:7`; `App.tsx` (no hook anywhere) | 2.4.2 Page Titled | `document.title` is never updated per route; every SPA page reports "CSE PhD Portal \| NIT Jamshedpur" | Add a `usePageTitle(title)` hook (listens to `location.pathname` in `App.tsx`) mapping each route to a descriptive title |
| 2 | Important | `components/ui/Tabs.tsx:36-57` (+ consumers `StudentDocuments`, `StudentMilestones`, `StudentEvents`, `StudentDeadlines`, `supervisor/StudentDetail`) | 4.1.2 Name, Role, Value; 1.3.1 Info & Relationships | Tabs have `role="tab"`/`aria-selected`/roving tabindex but no `id`/`aria-controls`, and the content area has no `role="tabpanel"`/`aria-labelledby` — the tab–panel relationship is not exposed to AT | Add `id={`tab-${key}`}` + `aria-controls`, wrap active content in `role="tabpanel"` with `aria-labelledby` and `tabIndex={0}` |
| 3 | Important | `components/student/DueDateCell.tsx:13` | 1.4.3 Contrast (Minimum) | `text-amber-600 "Due today"` ≈ 3.2:1 on white — fails 4.5:1 | Use `text-amber-700` (≈4.7:1) |
| 4 | Important | `pages/admin/EventManagement.tsx:347`; `pages/supervisor/SupervisorEvents.tsx:257` | 1.4.3 Contrast | `text-xs text-gray-400` "Title, date, start, and end time are required." ≈ 2.5:1 — fails AA | Use `text-gray-600` |
| 5 | Important | `components/ui/Input.tsx:33`, `PasswordInput.tsx:55`, `Select.tsx:52` | 1.4.3 Contrast | Error text `text-red-600 #dc2626` ≈ 4.48:1 on white — marginally under 4.5:1 | Use `text-red-700` for error copy |
| 6 | Important | `pages/student/StudentOnboarding.tsx:192-205` | 2.4.3 Focus Order; 3.2.1 On Focus; 2.4.7 Focus Visible | Step changes unmount the "Next" button; focus falls to `body` and the new step's fields/errors are never announced; first invalid field not focused after validation | On next/back: focus the first field of the new step (or the step heading) and add `aria-current="step"` to the active progress indicator |
| 7 | Important | `components/layout/Header.tsx:154-175` | 4.1.2 Name/Value; 1.1.1 Non-text | On <sm screens the account-menu trigger exposes only `Avatar` with `alt=""` — the button has no accessible name (`aria-expanded` on an unnamed control) | Add `aria-label={user.name}` (and `aria-haspopup="menu"` + id/`aria-controls` on the panel) |
| 8 | Important | `components/ui/Modal.tsx:70-103` | 1.3.1; 4.1.2 | Background app is not marked inert/`aria-hidden` while a modal is open, so SR virtual cursors can still read/interact with background; when callers omit `title` the dialog becomes unlabeled | In the `open` effect set `aria-hidden`/`inert` on the app root (or siblings behind overlay); require/fallback `aria-label` on the dialog |
| 9 | Minor | `components/ui/Skeleton.tsx:18,41` | 4.1.3 Status Messages | `role="status"` live regions contain no text — nothing is announced while loading | Add visually-hidden/polite "Loading…" text (or an `aria-label`) inside the status region |
| 10 | Minor | `components/ui/Alert.tsx:19` | 4.1.3 Status Messages | All alerts use `role="alert"`, including persistent success/info banners (e.g. `StudentCourses.tsx:153`) that announce on mount | Use `role="alert"` only for error/timely messages; success/info → `role="status" aria-live="polite"` |
| 11 | Minor | `components/layout/Header.tsx:177-194` | 4.1.2 | Dropdown items are plain buttons with no `role="menu"/menuitem`, trigger lacks `aria-haspopup`/`aria-controls` | Either add menu semantics or leave as disclosure but add `role`/`aria-controls` for correctness |
| 12 | Minor | `components/shared/ParticipantPicker.tsx:24-48`; `pages/admin/FormManagement.tsx:256-274`; `pages/admin/SrcCommitteeManagement.tsx:138-141` | 1.3.1 | Checkbox groups are labelled by a styled `<span>` rather than a grouped `<fieldset>/<legend>`; group name isn't associated with the controls | Wrap each checkbox group in `<fieldset>` + `<legend>` (sr-visible) |
| 13 | Minor | `pages/admin/StudentManagement.tsx:298`; `pages/admin/FacultyManagement.tsx:275`; `pages/student/StudentDocuments.tsx:118,152`; `supervisor/StudentDetail.tsx:223` | 1.3.1 | Empty `header: ''` produces empty `<th scope="col">` cells | Use `header: 'Photo'`/`'Open'` or render an `sr-only` header label |
| 14 | Minor | `pages/admin/SrcCommitteeManagement.tsx:164-171` | 2.4.4 / 4.1.2 | Repeated "Remove" buttons (one per member row) share identical accessible names | `aria-label` = `Remove member ${index + 1}` |
| 15 | Minor | `pages/supervisor/StudentList.tsx:155-161` | 2.4.4 Link Purpose; discoverability | Student-detail trigger is a `<button>` styled as plain text — sighted users get no affordance; keyboard users only | Add `<u>`/color affordance or convert to a real row-level link with hover underline |
| 16 | Minor | `pages/admin/StudentManagement.tsx:368-375`; `pages/admin/FacultyManagement.tsx:343-350` | 1.3.5 / usability | Admin create-form password uses plain `Input type="password"` with no `autoComplete="new-password"` and no show/hide toggle | Use `PasswordInput` with `autoComplete="new-password"` |
| 17 | Minor | `pages/student/StudentOnboarding.tsx:168-171` | 1.3.5 Input Purpose | DOB has no `autoComplete="bday"`; phone is `type="text"` with no `autoComplete="tel"`/`type="tel"` | Add `type="date"`+`autoComplete="bday"` and `type="tel"`+`autoComplete="tel"` |
| 18 | Minor | `pages/student/StudentDashboard.tsx:122-127` | 4.1.3 / 1.3.1 | Milestone progress bar is a styled `<div>` with no `role="progressbar"`/`aria-valuenow` (value is conveyed only by adjacent text) | Add `role="progressbar" aria-valuemin=0 aria-valuemax` + `aria-valuenow` |
| 19 | Minor | `pages/student/StudentDashboard.tsx:86-88` | 2.4.4 Link Purpose | StatCard unread-notifications link accessible name is just the number ("2") | Give the link a label, e.g. `aria-label="View unread notifications"` wrapping the count |
| 20 | Minor | `pages/auth/LoginPage.tsx`, `RegisterPage.tsx`, `VerifyOtpPage.tsx`, `NotFoundPage.tsx` | 2.4.1 Bypass Blocks | Auth/404 pages have no `main` landmark or skip link (skip link lives only in `DashboardLayout.tsx:9`) | Wrap auth/404 content in a `<main>`, optionally reuse skip link |
| 21 | Minor | `pages/supervisor/Approvals.tsx:214`; `Modal.tsx:76` | 4.1.2 | When `title` is `undefined` the dialog has no `aria-label` fallback | Belt-and-braces `aria-label="Untitled dialog"` or require title; default focus to the primary action instead of the panel |
| 22 | Minor | `components/shared/ProtectedRoute.tsx:11` | 4.1.3 | "Loading…" is plain text, not announced | Add `role="status"`/`aria-live="polite"` |

---

## Strengths worth keeping

- **Global `:focus-visible` ring** via `index.css:7-9` on top of Tailwind v4 — consistent, never disabled without a replacement (no `outline:none`/`outline-0` anywhere except paired `focus-visible` replacements).
- **`Input`/`Select`/`PasswordInput` primitives** — real `<label htmlFor>`, `aria-invalid`, `aria-describedby` to `-error`/`-hint`, `role="alert"` on field errors, and autocomplete on login/register/OTP (`email`, `current-password`, `new-password`, `one-time-code`).
- **`Modal.tsx`** — full focus trap, ESC-to-close, focus return to trigger, `role="dialog"`+`aria-modal`+`aria-labelledby`, click-outside, body scroll lock; `ConfirmModal` composes it cleanly. `MobileNav` implements the identical trap.
- **Skip link** (`DashboardLayout.tsx:9-14`) properly targets `#main` with the `sr-only`→`not-sr-only` pattern.
- **Tables** — semantic `<table>/<thead>/<tbody>`, `scope="col"`, correct `colSpan` on empty rows.
- **`Tabs.tsx`** roving tabindex, `aria-selected`, ArrowLeft/Right/Home/End — solid foundation, only missing the `tabpanel` wiring.
- **`Pagination`** — `<nav aria-label>`, `aria-label` prev/next, `aria-current="page"`, hidden ellipsis `aria-hidden`.
- **`NavList`/`Sidebar`** — `<ul>` list nav, `aria-label="Main navigation"`, single nav present in a11y tree at a time (mobile vs desktop); NavLink supplies `aria-current="page"`.
- **`Avatar`** — decorative `alt=""` photos + `aria-hidden` initial fallback; safe pattern given adjacent name text.
- **Status badge palettes** (`MILESTONE/APPROVAL/THESIS_STATUS_STYLE`) all use 50-bg/700-fg combos that pass AA (≈5.6–8.4:1).
- **`DueDateCell`, error copy, `QueryError`** — human-readable, actionable error messages; retry buttons present.
- **`aria-live` on skeletons + `role="alert"` on QueryError** — correct intent, just needs the accessible name/text (finding 9).

---

## Top 5 prioritized fixes

1. **Add per-route `document.title`** (WCAG 2.4.2) — global, one hook wired in `App.tsx`. (Finding 1)
2. **Close the modal background** — mark the app inert/`aria-hidden` when a `Modal`/`MobileNav` is open; improves SR behavior and stale-focus safety. (Finding 8)
3. **Fix wizard focus management** in `StudentOnboarding` — focus the new step's first field and mark `aria-current="step"`. (Finding 6)
4. **Complete the Tabs ARIA pattern** — `aria-controls`/`id` on tabs + `role="tabpanel"` wrapper. (Finding 2)
5. **Fix contrast failures** — `gray-400`→`gray-600` (event forms), `amber-600`→`amber-700` (DueDateCell), `red-600`→`red-700` (field errors). (Findings 3–5)

Fix ordering note: #1 is the cheapest global win; #2–#4 each touch a single shared component; #5 is a small palette change across three files. No behavioral or architectural risk in any of them.