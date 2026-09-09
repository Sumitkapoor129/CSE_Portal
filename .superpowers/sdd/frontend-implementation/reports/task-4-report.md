# Task 4 Report: UI primitives

Status: COMPLETE

## Files created (14)

`frontend/src/components/ui/`:
1. `Button.tsx`
2. `Input.tsx`
3. `Select.tsx`
4. `Card.tsx`
5. `Table.tsx`
6. `Badge.tsx`
7. `Modal.tsx`
8. `Tabs.tsx`
9. `Pagination.tsx`
10. `Skeleton.tsx`
11. `Alert.tsx`
12. `EmptyState.tsx`
13. `Spinner.tsx`

`frontend/src/components/shared/`:
14. `PageHeader.tsx`

`frontend/src/utils/`:
- `cn.ts` (tiny join helper, no dependency)

Each component has a named export (primary-function style) AND a default export. Table.tsx also exports `TableRow`, `TableCell`, `TableEmpty`; Skeleton.tsx also exports `SkeletonTable`, `SkeletonCards`; Button.tsx also exports `ButtonLink`.

## Signature confirmation (matches brief's interface list exactly)

- `Button({ variant?: 'primary'|'secondary'|'danger'; size?: 'sm'|'md'; className?: string; type?: 'button'|'submit'; disabled?: boolean; onClick?: () => void; children })` and `ButtonLink({ to: string; variant?: ...; size?: ...; className?: string; children })` — yes
- `Input({ id?, label?, error?, hint?, className?, ...rest: InputHTMLAttributes<HTMLInputElement> })` — yes
- `Select({ id?, label?, error?, options: { value; label }[], ...rest: SelectHTMLAttributes<HTMLSelectElement> })` — yes
- `Card({ title?, actions?, padded?, children, className? })` — yes (default padded=true)
- `Table({ columns: { key; header; className? }[], children })` + `TableRow({ children })` + `TableCell({ children; className? })` + `TableEmpty({ colSpan; message? })` — yes
- `Badge({ label: string; className?: string })` — yes
- `Modal({ open; onClose; title?; children; footer?; maxWidth?: 'sm'|'md'|'lg' })` — yes
- `Tabs({ tabs: { key; label }[]; active; onChange })` — yes
- `Pagination({ page; totalPages; onChange })` — yes
- `Skeleton({ className? })` + `SkeletonTable({ rows?; columns? })` + `SkeletonCards({ count? })` — yes (defaults rows=5, columns=4, count=3)
- `Alert({ variant?: 'info'|'success'|'error'|'warning'; children; onDismiss? })` — yes
- `EmptyState({ title: string; message?; action? })` — yes
- `Spinner({ label? })` — yes
- `PageHeader({ title: string; description?; actions? })` — yes

## Verification output

All run from workdir `frontend`, in order:

1. `npm run lint` — PASS (0 errors, 1 pre-existing warning in `src/hooks/useApi.ts` — not touched by this task)
2. `npm run typecheck` — PASS
3. `npm run build` — PASS:
   - vite v6.4.3, 29 modules transformed
   - `dist/assets/index-Cv4L-Y9U.css` 16.27 kB (gzip 4.27 kB)
   - `dist/assets/index-OR9QqBr0.js` 194.77 kB (gzip 60.95 kB), built in 4.64s

## Deviations / decisions

- **Spinner**: `animate-spin` is forbidden by AGENTS.md motion constraints. Implemented per the brief's resolution: `role="status"`, `aria-live="polite"`, renders text `Loading…`/`Loading <label>` with a single `animate-pulse` gray bar beneath. Non-gimmicky, no rotation.
- **Tabs keyboard navigation**: brief specifies the roving `tabIndex` (`active ? 0 : -1`); added ArrowLeft/ArrowRight/Home/End handling so inactive tabs remain keyboard-reachable, per the accessibility bar. Only the `transition-colors` animation is used.
- **Select**: uses the token input styling + `appearance-none`, with a small inline chevron SVG (cursor arrow, `pointer-events-none`) as the required dropdown affordance since `appearance-none` hides the native arrow. No extra dependency.
- **Modal**: full a11y — Escape keydown (active only while open), click-outside-to-close, body scroll lock restored on close/unmount, panel focused on open via `tabIndex={-1}`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby` from `useId`. Panel carries `outline-none` to avoid a full-panel focus ring on programmatic focus.
- **Input/Select error styling**: to avoid Tailwind class-conflict non-determinism, the error state uses its own complete literal class string (`border-red-300 focus:border-red-500 focus:ring-red-500` swapped into the full token string) rather than appending overrides to the normal token.
- **Badge**: per brief, `className ?? defaultClass` (exact token string), since page-supplied status color variants replace the gray default entirely rather than layering over it.
- All class strings are full literals in source; no runtime-constructed class names.
- No code comments added, no emoji, no new dependencies, no git commands run.

## Constraints confirmation

- No git commands run (repo has no git).
- No new dependencies installed (`cn` is a 1-line local helper).
- Lint/tsconfig not weakened.