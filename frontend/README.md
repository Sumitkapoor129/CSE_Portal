# CSE Portal Frontend

React 19 + Vite + TypeScript + Tailwind CSS v4 + React Router v6.

## Commands

| Command              | Purpose                        |
| -------------------- | ------------------------------ |
| `npm run dev`        | Vite dev server (port 5173)    |
| `npm run build`      | Type-check + production build  |
| `npm run preview`    | Preview production build       |
| `npm run lint`       | ESLint (flat config)           |
| `npm run typecheck`  | TypeScript strict check        |
| `npm test`           | Vitest (unit tests)            |

API base URL is `VITE_API_URL` (default `http://localhost:5000/api`). Copy `.env.example` to `.env` to override.

> Dev proxy note: `vite.config.ts` proxies `/api` to `http://localhost:5000`, so the dev server works without setting `VITE_API_URL`.

## Manual smoke checklist (requires a running backend with MongoDB)

1. Start the backend (`npm run dev` in the repo root; OTP emails log to console when no SMTP is configured).
2. `npm run dev` here, open http://localhost:5173.
3. Register → receive OTP → verify → login → role-based dashboard redirect.
4. Student: profile, milestones, courses, credits, thesis, events, deadlines, documents, notifications.
5. Supervisor: assigned students, student detail, approvals, events.
6. Admin: create/update student & faculty (toggle active), supervisor assignment, SRC committee, forms, deadlines, events, global search.
7. Verify `auth:unauthorized` behavior: expired/invalid token redirects to login without a full page reload.

## Backend gaps (intentional — not inventable)

1. No read endpoint for supervisors/admins to view a student's milestones → milestone-view/edit UI for those roles was not built (student-only).
2. No forgot/reset-password routes → no forgot-password link in the UI.
3. No admin semester/course management routes → no admin pages for those.
4. File uploads require pre-uploaded `fileUrl` strings (object storage) — forms collect URLs rather than uploading files.
5. Admin `createEvent` does not accept `semester`; supervisor's does.
6. Supervisor paginated lists omit `limit` — only `page`/`total`/`totalPages` are read.

All API paths follow `backend.md` verbatim; nothing was invented to fill gaps.
