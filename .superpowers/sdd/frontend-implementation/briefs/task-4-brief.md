# Task 4 Brief: UI primitives

Full plan: `docs/superpowers/plans/2026-09-08-frontend-implementation.md` (lines 1350–1433)
Design spec (REQUIRED reading): `docs/superpowers/specs/2026-09-08-frontend-design.md` (Design System section — colors, typography, spacing)

IMPORTANT REPO RULES:
- This repo has NO git. Do NOT run any git commands. Skip the plan's commit step.
- Work from repo root `C:\Users\91983\Desktop\VibeCoded\CSE_portal`. All code under `frontend/`.
- NEVER add code comments. No emoji.
- This task has NO tests — verification is `npm run lint` + `npm run build` — but code must be type-safe and clean.
- No runtime-constructed Tailwind class names. Every class must be a full literal string in the source.
- Tailwind v4 default palette: `blue-600` primary, `gray-*` neutrals, `red-600` danger, `green-*`/`amber-*` status. NO gradients, glows, heavy shadows.
- The ONLY allowed animation is `animate-pulse` (skeleton). Do not add transitions/keyframes beyond minimal (`transition-colors` on interactive elements is acceptable).

## Goal
Create 14 small, focused, accessible UI primitive components under `frontend/src/components/ui/` (13 files) and `frontend/src/components/shared/PageHeader.tsx` (1 file). Default export each component AND export named (pages will import named: `import { Button } from '../ui/Button'`). Use `export function Button(...)` named exports.

## Exact interfaces to implement

Design tokens (exact class strings — use these verbatim):

- Primary button base: `inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50` (sm size: `px-3 py-1.5 text-xs`; md: `px-4 py-2 text-sm`)
- Secondary button: `inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50`
- Danger button: `inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50`
- Input: `block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400`
- Input label: `block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1`
- Input error text: `mt-1 text-xs text-red-600`; hint text: `mt-1 text-xs text-gray-500`
- Card: `rounded-lg border border-gray-200 bg-white p-6` (padded=false → `p-0`); optional header row with `border-b border-gray-200 px-6 py-4` + title `text-base font-semibold text-gray-900`
- Modal overlay: `fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4`; panel: `relative w-full max-w-lg rounded-lg bg-white p-6 shadow-lg` with `max-w-sm`/`max-w-md`/`max-w-lg` options; close button top-right
- Badge default: `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700`
- Alert variants: error `rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700`; success `rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700`; warning `rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700`; info `rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700`
- EmptyState: container `py-12 text-center`, title `text-sm font-medium text-gray-900`, message `mt-1 text-sm text-gray-500`
- Skeleton: `animate-pulse rounded bg-gray-200`
- Pagination buttons: page number active `bg-blue-600 text-white`, inactive `bg-white text-gray-700 border border-gray-300 hover:bg-gray-50`; prev/next `text-gray-700`, disabled `disabled:opacity-50`

Components:

1. **Button.tsx** — `Button({ variant?: 'primary'|'secondary'|'danger'; size?: 'sm'|'md'; className?: string; type?: 'button'|'submit'; disabled?: boolean; onClick?: () => void; children })` renders `<button>` with token classes composed from literals keyed by variant/size (maps are fine — full literal strings per entry). Also export `ButtonLink({ to: string; variant?: 'primary'|'secondary'|'danger'; size?: 'sm'|'md'; className?: string; children })` rendering `<Link to={to} className={...}>`.

2. **Input.tsx** — `Input({ id?: string; label?: string; error?: string; hint?: string; className?: string; ...rest: InputHTMLAttributes<HTMLInputElement> })`. Label uses `htmlFor={id}`. Show `error` text (red) if present, else `hint` (gray). Input border red when error: `border-red-300 focus:border-red-500 focus:ring-red-500`.

3. **Select.tsx** — `Select({ id?: string; label?: string; error?: string; options: { value: string; label: string }[]; ...rest: SelectHTMLAttributes<HTMLSelectElement> })`. Native `<select>` with same input styling + `appearance-none`.

4. **Card.tsx** — `Card({ title?: string; actions?: React.ReactNode; padded?: boolean; children; className?: string })`. If `title`, render header row with title + actions. Default padded.

5. **Table.tsx** — `Table({ columns: { key: string; header: string; className?: string }[]; children })` renders semantic `<table className="w-full text-left text-sm">`, `<thead>` with `<th className="border-b border-gray-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">`. `TableRow({ children })` → `<tr className="border-b border-gray-100 hover:bg-gray-50">`. `TableCell({ children; className? })` → `<td className="px-4 py-3 align-middle">`. Helper `TableEmpty({ colSpan: number; message?: string })` → single row `<td colSpan>` with EmptyState-ish centered message (`text-sm text-gray-500 py-8 text-center`).

6. **Badge.tsx** — `Badge({ label: string; className?: string })` → `<span className={className ?? 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700'}>`.

7. **Modal.tsx** — `Modal({ open: boolean; onClose: () => void; title?: string; children; footer?: React.ReactNode; maxWidth?: 'sm'|'md'|'lg' })`. Requirements: `role="dialog"`, `aria-modal="true"`, `aria-labelledby={titleId}`; overlay click-outside closes; Escape key closes (`useEffect` keydown listener, active only when open); body scroll lock while open (`document.body.style.overflow = 'hidden'` restored on close/unmount); focus the panel on open; render nothing when `!open`.

8. **Tabs.tsx** — `Tabs({ tabs: { key: string; label: string }[]; active: string; onChange: (key: string) => void })`. Container `border-b border-gray-200 flex gap-1`; active tab `border-b-2 border-blue-600 text-blue-700 font-medium`, inactive `text-gray-500 hover:text-gray-900`. `role="tablist"`, each `role="tab"`, `aria-selected`, `tabIndex={active ? 0 : -1}`.

9. **Pagination.tsx** — `Pagination({ page: number; totalPages: number; onChange: (page: number) => void })`. Renders nothing when `totalPages <= 1`. Previous/Next buttons (`aria-label="Previous page"`/`"Next page"`, disabled at bounds) + numbered buttons `aria-label="Page N"`. Show numbered window around current (e.g., first, last, current±1 with `…` ellipsis as plain spans). Active `bg-blue-600 text-white`, inactive as token above.

10. **Skeleton.tsx** — `Skeleton({ className?: string })` → `<div className={cn('animate-pulse rounded bg-gray-200', className)} />`. `SkeletonTable({ rows?: number; columns?: number })` → table-shaped grid of skeletons. `SkeletonCards({ count?: number })` → grid/gap of card-shaped skeletons. (Set sensible defaults: rows=5, columns=4, count=3.)

11. **Alert.tsx** — `Alert({ variant?: 'info'|'success'|'error'|'warning'; children; onDismiss?: () => void })`. Uses variant token classes; if `onDismiss`, render a dismiss button top-right with `aria-label="Dismiss"`, `role="alert"` on container.

12. **EmptyState.tsx** — `EmptyState({ title: string; message?: string; action?: React.ReactNode })` per token above.

13. **Spinner.tsx** — `Spinner({ label?: string })`. Accessible: container with `role="status"`, `aria-live="polite"`. Visual: `animate-spin` NOT allowed per AGENTS.md (motion constraints) — use a subtle indeterminate bar instead: a bar with `animate-pulse` is also disallowed semantically... DECISION: render text `Loading{label ? ` ${label}` : '…'}` with a light `animate-pulse` skeleton row beneath, `role="status"`. Keep it minimal and non-gimmicky.

14. **`frontend/src/components/shared/PageHeader.tsx`** — `PageHeader({ title: string; description?: string; actions?: React.ReactNode })`. Layout: `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6`; title `text-2xl font-semibold text-gray-900`; description `mt-1 text-sm text-gray-500`.

## Accessibility (mandatory)
- Semantic HTML everywhere (`button`, `label htmlFor`, `table/thead/tbody`, `dialog` role).
- Keyboard: Modal (Escape, focus), Tabs (tabIndex model), Pagination (native buttons).
- Sufficient contrast, focus-visible retained (global focus ring from `index.css`).

## Ports/imports
Check the tree: components import `react-router-dom` only for `ButtonLink` (`Link`). `cn` helper: create a tiny local helper if needed (e.g., `frontend/src/utils/cn.ts`: `export function cn(...parts: (string | false | null | undefined)[]) { return parts.filter(Boolean).join(' '); }`) — reasonable, reuse across files, do NOT add a dependency.

## Steps
1. Create the components (all 14 files). Respect the exact interface names/props — later tasks import them by these names.
2. Run (workdir `frontend`, in order): `npm run lint`, then `npm run typecheck`, then `npm run build`. All must pass. Fix causally if not (never weaken configs).
3. Write a report to `C:\Users\91983\Desktop\VibeCoded\CSE_portal\.superpowers\sdd\frontend-implementation\reports\task-4-report.md`.

## Report back
1. Files created (paths).
2. Confirmation each exported signature is exactly per the interface list.
3. Verification output for lint/typecheck/build.
4. Any deviations (e.g., the Spinner resolution) with reasons.