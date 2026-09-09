# Task 5 Report: Application shell (layout, sidebar, header, mobile nav)

Status: COMPLETE

## Files created (7)

1. `frontend/src/components/layout/navConfig.ts` — shared nav config (nav list duplication avoidance)
2. `frontend/src/components/layout/NavList.tsx` — shared role-aware nav renderer
3. `frontend/src/components/layout/Sidebar.tsx`
4. `frontend/src/components/layout/Header.tsx`
5. `frontend/src/components/layout/MobileNav.tsx`
6. `frontend/src/components/layout/DashboardLayout.tsx`
7. `frontend/src/pages/NotFoundPage.tsx`

## Confirmations

- Nav lists match the role configs exactly (counts: student 10, supervisor 4, admin 9; every `to`/`label` per brief).
- `DashboardLayout` renders `Sidebar` + `Header` + `<main className="lg:pl-64">` wrapping `<Outlet />` (brief's 4-6-8 inner padding). Not a route guard.
- `Header` includes Change Password modal (current/new/confirm, `required` + length ≥ 8 + match validation, calls `authApi.changePassword`, success `Alert` auto-closes after ~1.4s, error `Alert` otherwise) and Sign out (`logout()` + `navigate('/auth/login', { replace: true })`).
- `MobileNav` drawer closes on overlay click, Escape, and after navigating (nav items pass `onNavigate={close}`); `aria-modal="true"` when open; panel focused on open.
- Sidebar dropdown/settings: `aria-haspopup="menu"`/`aria-expanded`, Escape + click-outside close, panel focused on open; hamburger `aria-label="Open menu"`/`aria-expanded`.
- `Sidebar`/`MobileNav` share one nav source (`navConfig.ts` + `NavList.tsx`), eliminating both config and render duplication.

## Verification output (workdir `frontend`, in order)

1. `npm run lint` — PASS (0 errors; 1 pre-existing warning in `src/hooks/useApi.ts:36`, untouched by this task)
2. `npm run typecheck` — PASS
3. `npm run build` — PASS: vite v6.4.3, 29 modules; `index-DhmcoG5B.css` 18.32 kB (gzip 4.64 kB); `index-ChtD0YCV.js` 194.77 kB (gzip 60.95 kB), built in 5.45s.

## Deviations / decisions

- Added `NavList.tsx` (a 7th file beyond the brief's 5 + config) as a shared role-aware nav renderer so Sidebar and MobileNav share the identical link markup and active/inactive class logic, not just the data. Both still satisfy the brief's per-file interfaces.
- `JSX.Element` return type does not accept `null` under TS strict; the "render nothing when user missing" branches return an empty fragment `<></>` instead of `null`, preserving the exact brief signature.
- `end` on `NavLink` is derived per item via `isNavIndex` (index routes are the only single-segment paths), so index Dashboard links don't stay active on child routes.
- Empty state in Sidebar/MobileNav: the old password is never auto-filled since the form keys off a fresh empty object on open.
- Only `transition-colors` used for interactive states; no gradients/glows/heavy shadows; full literal Tailwind strings throughout (active/inactive classes are complete literals branch-selected, no runtime string construction).
- No code comments, no emoji, no new dependencies, no git commands run.

## Constraints confirmation

- No git commands run (repo has no git).
- Lint/tsconfig not weakened; existing warning left untouched.