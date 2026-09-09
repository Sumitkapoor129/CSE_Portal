# CSE Portal Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, production-grade React frontend for the CSE PhD Scholar Management Portal, consuming the existing Express backend exactly as documented in `backend.md`.

**Architecture:** React 19 + Vite 6 + TypeScript (strict) + Tailwind CSS v4 (via `@tailwindcss/vite` plugin) + React Router v6. Lightweight custom design system — no UI libraries, no state-management libraries. Auth via JWT stored in `localStorage`, role-based route guards, thin fetch-based API layer.

**Tech Stack:** React 19, Vite 6, TypeScript 5.8+, Tailwind CSS v4, React Router v6, Vitest 3 (unit tests only), ESLint 9 flat config.

**Spec:** `docs/superpowers/specs/2026-09-08-frontend-design.md`

## Global Constraints

- All code lives under `frontend/` at the repo root. Run all frontend commands with `workdir: frontend`.
- **Backend is the source of truth** (`backend.md` + `src/routes/*`). Do NOT invent routes, methods, params, or response fields. No mock APIs that shadow real routes.
- Authentication: Bearer token in `Authorization` header. Success envelope: `{ success: true, data }`. Error envelope: `{ message }` (and 401/403/404/409/500 semantics per `backend.md`).
- Response `data` is returned unwrapped by the API layer — pages consume `data` directly.
- Typescript strict mode is REQUIRED. `npm run build` must pass (runs `tsc -b` + `vite build`).
- Design tokens locked in spec §Design System. Use Tailwind utility classes exactly as specified — no custom hex colors, no arbitrary shadows, no gradients.
- Roles: `student`, `supervisor`, `admin`. Sidebar/nav must be role-aware.
- No comment lines in source (per repo AGENTS.md). No emoji in UI.
- Lint/typecheck/test after every change: `npm run lint`, `npm run build`, `npm test`.

## Known Backend Gaps (documented — do NOT invent APIs to fill them)

1. **Supervisor/admin milestone READING:** No endpoint lets a supervisor or admin list a student's milestones (only `PUT /milestones/:id` write routes exist; `GET /student/milestones` is student-only). Therefore milestone *editing* pages are **not built** for supervisor/admin. The student milestone page is read-only but fully functional. If this feature is desired, a backend read endpoint must be added first.
2. **Forgot / reset password:** Described in project context but NOT implemented as routes in `src/routes/authRoutes.ts`. The login page must NOT show a "forgot password" link.
3. **Admin semester/course management:** No admin routes exist. Semesters and courses are student self-service. The admin sidebar must NOT include semester/course management pages.
4. **Admin event creation** does not accept a `semester` field (supervisor event creation does). Respect this difference in each form.
5. **`limit` in pagination:** Admin pagination objects include `pagination.limit`; supervisor pagination objects omit it. The UI must only read `page`, `total`, `totalPages`.

## Recommended Versions (pin these)

- `react@^19.2.0`, `react-dom@^19.2.0`, `@types/react@^19.2.0`, `@types/react-dom@^19.2.0`
- `react-router-dom@^6.30.0` (v6 per approved design)
- `vite@^6.3.5`, `@vitejs/plugin-react@^4.6.0`
- `tailwindcss@^4.3.0`, `@tailwindcss/vite@^4.3.0`
- `typescript@^5.8.0`
- `vitest@^3.2.4` (dev)
- `eslint@^9.0.0`, `@eslint/js@^9.0.0`, `typescript-eslint@^8.0.0`, `eslint-plugin-react-hooks@^5.0.0` (dev)

Tailwind v4 uses the Vite plugin — no `tailwind.config.js`, no `postcss.config.js`. Theme customization (if needed) happens via `@theme` in CSS; the palette used is the default Tailwind palette, so no `@theme` block is required.

---

### Task 1: Scaffold the frontend project

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`, `frontend/tsconfig.app.json`, `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/eslint.config.js`
- Create: `frontend/index.html`
- Create: `frontend/.env.example`
- Create: `frontend/.gitignore`
- Create: `frontend/src/vite-env.d.ts`, `frontend/src/main.tsx`, `frontend/src/App.tsx` (temporary), `frontend/src/index.css`
- Create: `frontend/src/__tests__/setup.test.ts`
- Create: `frontend/README.md`

**Interfaces:**
- Produces: the `family` of scripts `dev`, `build`, `preview`, `test`, `lint`; `VITE_API_URL` env var (default `http://localhost:5000/api`).

- [ ] **Step 1: Create `frontend/package.json`**

```json
{
  "name": "cse-portal-frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "typecheck": "tsc -b --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^6.30.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.0.0",
    "@tailwindcss/vite": "^4.3.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^4.6.0",
    "eslint": "^9.0.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "tailwindcss": "^4.3.0",
    "typescript": "^5.8.0",
    "typescript-eslint": "^8.0.0",
    "vite": "^6.3.5",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: Create `frontend/tsconfig.json`** (root project refs file)

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 3: Create `frontend/tsconfig.app.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `frontend/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts", "eslint.config.js"]
}
```

- [ ] **Step 5: Create `frontend/vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

Note: the `test` key needs Vitest's type augmentation. Add the triple-slash reference in `src/vite-env.d.ts`: `/// <reference types="vitest/config" />`.

- [ ] **Step 6: Create `frontend/eslint.config.js`**

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  }
);
```

- [ ] **Step 7: Create `frontend/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="CSE PhD Scholar Management Portal, NIT Jamshedpur" />
    <title>CSE PhD Portal | NIT Jamshedpur</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Create `frontend/.env.example`**

```text
VITE_API_URL=http://localhost:5000/api
```

- [ ] **Step 9: Create `frontend/.gitignore`**

```text
node_modules
dist
.env
*.local
```

- [ ] **Step 10: Create `frontend/src/index.css`**

```css
@import "tailwindcss";

@layer base {
  body {
    @apply bg-gray-50 text-gray-900 antialiased;
  }
  :focus-visible {
    @apply outline-2 outline-offset-2 outline-blue-600;
  }
}
```

- [ ] **Step 11: Create `frontend/src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
/// <reference types="vitest/config" />
```

- [ ] **Step 12: Create `frontend/src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 13: Create temporary `frontend/src/App.tsx`**

```tsx
export default function App() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold text-gray-900">CSE PhD Scholar Portal</h1>
      <p className="mt-2 text-sm text-gray-600">Frontend scaffolding ready.</p>
    </main>
  );
}
```

- [ ] **Step 14: Create `frontend/src/__tests__/setup.test.ts`** (verify test runner)

```ts
import { describe, expect, it } from 'vitest';

describe('scaffold', () => {
  it('runs the test runner', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 15: Create `frontend/README.md`** with commands:

```markdown
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
```

- [ ] **Step 16: Install and verify**

Run (workdir `frontend`):
```bash
npm install
npm run lint
npm test
npm run build
```
Expected: lint clean, 1 test passes, `tsc -b && vite build` succeeds and emits `dist/`.

- [ ] **Step 17: Commit**

```bash
git add frontend
git commit -m "feat(frontend): scaffold vite react tailwind project"
```
(If repo has no git history, skip commit and continue.)

---

### Task 2: Core domain types, API client, and utilities

**Files:**
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/utils/formatDate.ts`
- Create: `frontend/src/utils/constants.ts`
- Create: `frontend/src/utils/validators.ts`
- Test: `frontend/src/api/client.test.ts`, `frontend/src/utils/validators.test.ts`, `frontend/src/utils/formatDate.test.ts`

**Interfaces:**
- Produces (used by all later tasks):
  - `export type UserRole`, `StudentType`, `ApprovalStatus`, `ThesisStatus`, `EventType`, `SRCMemberRole`, `MilestoneStatus` (string unions, mirror `src/types/index.ts` on the backend)
  - `export interface AuthUser { id: string; name: string; email: string; role: UserRole; isActive?: boolean }`
  - `export type Pagination = { page: number; limit?: number; total: number; totalPages: number }`
  - `export interface ApiEnvelope<T> { success: boolean; data: T; message?: string }`
  - `export class ApiError extends Error { status: number }`
  - `export const TOKEN_KEY = 'cse_portal_token'`
  - `export function getStoredToken(): string | null`
  - `export function setStoredToken(token: string): void`
  - `export function clearStoredToken(): void`
  - `export async function apiFetch<T>(path: string, options?: { method?: 'GET'|'POST'|'PUT'|'DELETE'; body?: unknown; query?: Record<string, unknown> }): Promise<T>`
  - `export function formatDate(value: string | Date | null | undefined): string`
  - `export function formatDateTime(value: string | Date | null | undefined): string`
  - `export function daysUntil(date: string | Date | null | undefined): number | null`
  - `export const ROLE_LABELS`, `STUDENT_TYPE_LABELS`, `MILESTONE_STATUS_LABELS`, `APPROVAL_STATUS_LABELS`, `THESIS_STATUS_LABELS`, `EVENT_TYPE_LABELS`, `MILESTONE_STATUS_STYLE`, `APPROVAL_STATUS_STYLE`, `THESIS_STATUS_STYLE` (label → badge Tailwind classes mapping)
  - `export function validateEmail(v: string): boolean`
  - `export function required(v: unknown): v is string` / `export function requiredWithMessage(value: unknown, field: string): string | null`

- [ ] **Step 1: Write the failing tests for `apiFetch`**

`frontend/src/api/client.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, ApiError, clearStoredToken, setStoredToken, TOKEN_KEY } from './client';

function mockFetchOnce(status: number, json: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => json,
  } as unknown as Response);
}

afterEach(() => {
  vi.unstubAllGlobals();
  clearStoredToken();
});

describe('apiFetch', () => {
  it('sends bearer token and unwraps data', async () => {
    setStoredToken('abc.def.ghi');
    mockFetchOnce(200, { success: true, data: { ok: 1 } });
    const data = await apiFetch<{ ok: number }>('/dashboard');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/dashboard'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer abc.def.ghi' }),
      })
    );
    expect(data).toEqual({ ok: 1 });
  });

  it('appends query params', async () => {
    mockFetchOnce(200, { success: true, data: [] });
    await apiFetch('/students', { query: { page: 2, search: 'a b' } });
    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(url).toContain('page=2');
    expect(url).toContain('search=a%20b');
  });

  it('throws ApiError with server message and status', async () => {
    mockFetchOnce(409, { message: 'Duplicate / conflict' });
    await expect(apiFetch('/students')).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      message: 'Duplicate / conflict',
    });
  });

  it('clears token and dispatches auth:unauthorized on 401', async () => {
    setStoredToken('expired.token');
    mockFetchOnce(401, { message: 'Invalid or expired token' });
    const dispatched: unknown[] = [];
    const handler = (e: Event) => dispatched.push(e);
    window.addEventListener('auth:unauthorized', handler);
    await expect(apiFetch('/me')).rejects.toThrow(ApiError);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(dispatched).toHaveLength(1);
    window.removeEventListener('auth:unauthorized', handler);
  });
});
```

Note: on 401 the client MUST `clearStoredToken()` and dispatch `window.dispatchEvent(new CustomEvent('auth:unauthorized'))` — it must NOT mutate `window.location` (breaks jsdom tests; the AuthContext listens for the event and the router guards redirect).

- [ ] **Step 2: Run the tests to verify they fail**

Run (workdir `frontend`): `npm test`
Expected: FAIL — module `./client` not found / functions undefined.

- [ ] **Step 3: Write the failing tests for utilities**

`frontend/src/utils/formatDate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { daysUntil, formatDate, formatDateTime } from './formatDate';

describe('formatDate', () => {
  it('formats ISO date string to YYYY-MM-DD', () => {
    expect(formatDate('2026-12-01T00:00:00Z')).toBe('2026-12-01');
  });
  it('returns "—" for null/undefined', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
  });
});

describe('formatDateTime', () => {
  it('includes time', () => {
    expect(formatDateTime('2026-09-15T11:00:00Z')).toMatch(/2026-09-15/);
  });
});

describe('daysUntil', () => {
  it('returns positive days for future date', () => {
    const future = new Date(Date.now() + 3 * 86400000).toISOString();
    expect(daysUntil(future)).toBe(3);
  });
  it('returns null for null input', () => {
    expect(daysUntil(null)).toBeNull();
  });
});
```

`frontend/src/utils/validators.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { required, validateEmail } from './validators';

describe('validateEmail', () => {
  it('accepts valid emails', () => {
    expect(validateEmail('s@college.edu')).toBe(true);
  });
  it('rejects invalid emails', () => {
    expect(validateEmail('not-an-email')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });
});

describe('required', () => {
  it('rejects empty and blank values', () => {
    expect(required('')).toBe(false);
    expect(required('   ')).toBe(false);
    expect(required(undefined)).toBe(false);
    expect(required(0)).toBe(false);
  });
  it('accepts non-empty strings and numbers', () => {
    expect(required('x')).toBe(true);
    expect(required(4)).toBe(true);
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run (workdir `frontend`): `npm test`
Expected: FAIL — missing modules.

- [ ] **Step 5: Implement the API client**

`frontend/src/api/client.ts`:

```ts
export const TOKEN_KEY = 'cse_portal_token';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, unknown>;
}

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { method = 'GET', body, query } = options;

  const url = new URL(`${API_URL}${path}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Unable to reach the server. Please try again.', 0);
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    const message =
      json && typeof json === 'object' && 'message' in json && typeof (json as { message?: unknown }).message === 'string'
        ? (json as { message: string }).message
        : `Request failed (${res.status}).`;
    if (res.status === 401) {
      clearStoredToken();
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    throw new ApiError(message, res.status);
  }

  const envelope = json as ApiEnvelope<T> | null;
  return envelope?.data as T;
}
```

- [ ] **Step 6: Implement the utility modules**

`frontend/src/utils/formatDate.ts`:

```ts
const pad = (n: number) => String(n).padStart(2, '0');

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function daysUntil(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const target = new Date(value).getTime();
  const now = new Date().setHours(0, 0, 0, 0);
  return Math.ceil((target - now) / 86400000);
}
```

`frontend/src/utils/validators.ts`:

```ts
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

export function required(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : value !== undefined && value !== null;
}

export function requiredWithMessage(value: unknown, field: string): string | null {
  return required(value) ? null : `${field} is required`;
}
```

`frontend/src/utils/constants.ts`:

```ts
import type { ApprovalStatus, EventType, MilestoneStatus, StudentType, ThesisStatus, UserRole } from '../types';

export const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Student',
  supervisor: 'Supervisor',
  admin: 'Administrator',
};

export const STUDENT_TYPE_LABELS: Record<StudentType, string> = {
  frp: 'Full-time (FRP)',
  erp: 'External (ERP)',
};

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  skipped: 'Skipped',
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  resubmission_required: 'Resubmission Required',
};

export const THESIS_STATUS_LABELS: Record<ThesisStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  resubmission_required: 'Resubmission Required',
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  seminar: 'Seminar',
  comprehensive_exam: 'Comprehensive Exam',
  progress_review: 'Progress Review',
  thesis_defense: 'Thesis Defense',
  course_registration: 'Course Registration',
  other: 'Other',
};

const badge =
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border';

export const MILESTONE_STATUS_STYLE: Record<MilestoneStatus, string> = {
  pending: `${badge} bg-gray-50 text-gray-700 border-gray-200`,
  in_progress: `${badge} bg-blue-50 text-blue-700 border-blue-200`,
  completed: `${badge} bg-green-50 text-green-700 border-green-200`,
  skipped: `${badge} bg-amber-50 text-amber-700 border-amber-200`,
};

export const APPROVAL_STATUS_STYLE: Record<ApprovalStatus, string> = {
  pending: `${badge} bg-amber-50 text-amber-700 border-amber-200`,
  approved: `${badge} bg-green-50 text-green-700 border-green-200`,
  rejected: `${badge} bg-red-50 text-red-700 border-red-200`,
  resubmission_required: `${badge} bg-blue-50 text-blue-700 border-blue-200`,
};

export const THESIS_STATUS_STYLE: Record<ThesisStatus, string> = {
  draft: `${badge} bg-gray-50 text-gray-700 border-gray-200`,
  submitted: `${badge} bg-blue-50 text-blue-700 border-blue-200`,
  under_review: `${badge} bg-amber-50 text-amber-700 border-amber-200`,
  approved: `${badge} bg-green-50 text-green-700 border-green-200`,
  rejected: `${badge} bg-red-50 text-red-700 border-red-200`,
  resubmission_required: `${badge} bg-amber-50 text-amber-700 border-amber-200`,
};
```

**Tailwind v4 constraint:** Tailwind scans source files for *complete* literal class tokens (e.g. `bg-green-50`). Never build class names at runtime (no `bg-${color}-50`). Every class above appears as a full literal string in the source file.

- [ ] **Step 7: Implement the core domain types**

`frontend/src/types/index.ts`:

```ts
export type UserRole = 'student' | 'supervisor' | 'admin';
export type StudentType = 'frp' | 'erp';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'resubmission_required';
export type ThesisStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'resubmission_required';
export type EventType = 'seminar' | 'comprehensive_exam' | 'progress_review' | 'thesis_defense' | 'course_registration' | 'other';
export type SRCMemberRole = 'chairperson' | 'supervisor' | 'co_supervisor' | 'member';
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type MilestoneKey =
  | 'admission' | 'src_formed' | 'course_work' | 'comprehensive_exam' | 'topic_registration'
  | 'enhancement_seminar' | 'pre_submission' | 'thesis_submitted' | 'thesis_approved' | 'defense' | 'degree_awarded';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
}

export interface Pagination {
  page: number;
  limit?: number;
  total: number;
  totalPages: number;
}

export interface UserShort {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface FacultyShort {
  _id: string;
  employeeId?: string;
  department?: string;
  designation?: string;
  profilePhoto?: string;
}

export interface SRCMember {
  faculty: FacultyShort | string;
  role: SRCMemberRole;
}

export interface SRCCommittee {
  _id: string;
  student: string;
  members: SRCMember[];
  createdAt?: string;
}

export interface StudentProfileView {
  _id: string;
  user: UserShort;
  collegeId: string;
  rollNumber: string;
  studentType: StudentType;
  department: string;
  researchArea: string;
  admissionDate: string;
  requiredCredits: number;
  profilePhoto?: string;
  supervisor?: FacultyShort | null;
  coSupervisor?: FacultyShort | null;
  srcCommittee?: SRCCommittee | null;
  isProfileComplete: boolean;
}

export interface Semester {
  _id: string;
  student: string;
  semesterNumber: number;
  academicYear: string;
  startDate?: string;
  endDate?: string;
}

export interface Course {
  _id: string;
  semester: string | Semester;
  courseCode: string;
  courseName: string;
  credits: number;
  grade?: string;
  status: ApprovalStatus;
}

export interface StudentCourse {
  _id: string;
  student: string | StudentProfileView;
  course: Course | string;
  semester: Semester | string;
  status: ApprovalStatus;
  supervisorComment?: string;
  approvedBy?: UserShort | string;
  approvedAt?: string;
}

export interface Credits {
  _id: string;
  student: string;
  semester: string | Semester;
  earnedCredits: number;
  requiredCredits: number;
}

export interface CreditsSummary {
  earned: number;
  required: number;
  remaining: number;
}

export interface CreditsListResponse {
  semesters: Credits[];
  totalEarnedCredits: number;
}

export interface DocumentView {
  _id: string;
  student: string;
  semester?: Semester | string;
  documentName: string;
  documentType: string;
  fileUrl: string;
  uploadedBy: UserShort | string;
  uploadDate: string;
  approvalStatus: ApprovalStatus;
}

export interface Form {
  _id: string;
  formName: string;
  formType: string;
  fileUrl: string;
  semesterApplicable?: number[];
  studentTypeApplicable?: StudentType[];
  department?: string;
}

export interface Thesis {
  _id: string;
  student: string;
  title: string;
  documentUrl: string;
  submissionDate: string;
  version: number;
  status: ThesisStatus;
  supervisorComments?: string;
  approvedBy?: UserShort | string;
  approvedAt?: string;
}

export interface EventView {
  _id: string;
  title: string;
  eventType: EventType;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  organizer: UserShort | string;
  participants?: { participant: UserShort | string; participantModel: string }[];
  semester?: Semester | string;
  deadline?: string;
}

export interface Deadline {
  _id: string;
  title: string;
  description?: string;
  dueDate: string;
  semester?: Semester | string;
  student?: StudentProfileView | string;
  createdBy?: UserShort | string;
  notificationSent?: boolean;
}

export interface Notification {
  _id: string;
  user: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface Milestone {
  _id: string;
  student: string;
  key: MilestoneKey;
  title: string;
  description: string;
  status: MilestoneStatus;
  order: number;
  dueDate?: string;
  completedAt?: string;
  updatedBy?: string;
}

export interface TimelineItem {
  type: 'semester' | 'course';
  semesterNumber?: number;
  academicYear?: string;
  startDate?: string;
  endDate?: string;
  courseCode?: string;
  courseName?: string;
  credits?: number;
  status?: ApprovalStatus;
  [key: string]: unknown;
}

export interface ApprovalRequestView {
  _id: string;
  requester: StudentProfileView | string;
  type: string;
  status: ApprovalStatus;
  data: Record<string, unknown>;
  reviewComment?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface PendingApprovals {
  courseApprovals: StudentCourse[];
  thesisApprovals: Thesis[];
  generalApprovals: ApprovalRequestView[];
}

export interface StudentOption {
  userId: string;
  profileId: string;
  name: string;
  rollNumber: string;
  department: string;
  studentType: StudentType;
}
```

- [ ] **Step 8: Run all tests to verify they pass**

Run (workdir `frontend`): `npm test`
Expected: `apiFetch`, `formatDate`, `validators` suites all PASS.

- [ ] **Step 9: Run lint and build**

Run (workdir `frontend`): `npm run lint` and `npm run build`
Expected: lint clean; build succeeds.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/types frontend/src/api frontend/src/utils
git commit -m "feat(frontend): add api client, types, and utilities"
```

---

### Task 3: Auth state, generic `useApi` hook, and route guard

**Files:**
- Create: `frontend/src/context/AuthContext.tsx`
- Create: `frontend/src/hooks/useAuth.ts`
- Create: `frontend/src/hooks/useApi.ts`
- Create: `frontend/src/api/auth.ts`
- Create: `frontend/src/components/shared/ProtectedRoute.tsx`
- Test: `frontend/src/hooks/useApi.test.ts`, `frontend/src/api/auth.test.ts`

**Interfaces:**
- Produces:
  - `export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element`
  - `export function useAuth(): { user: AuthUser | null; initializing: boolean; login(email, password): Promise<AuthUser>; logout(): void; reload(): Promise<void> }`
  - `export interface UseApiResult<T> { data: T | null; loading: boolean; error: string | null; refetch(): void }`
  - `export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []): UseApiResult<T>`
  - `export const authApi = { login(email: string, password: string): Promise<{ token: string; user: AuthUser }>; register(payload): Promise<{ token; user; message }>; verifyOtp(email, otp): Promise<{ message: string }>; me(): Promise<AuthUser & { profile?: unknown }>; changePassword(currentPassword, newPassword): Promise<{ message: string }> }`
  - `export function ProtectedRoute({ roles }: { roles?: UserRole[] }): JSX.Element | null`

Auth context behavior:
- On mount, if a token exists in localStorage, call `authApi.me()`; store `user`. Failure clears token. `initializing` is true until resolved.
- `login(email, password)` → `authApi.login` → store token via `setStoredToken` → set user → return user.
- `logout()` → `clearStoredToken()` → set user null.
- `reload()` re-fetches me and refreshes user state.

`ProtectedRoute`: null while `initializing`; if no user → `<Navigate to="/auth/login" replace />`; if `roles` provided and current role not included → `<Navigate to="/" replace />`; else render `children` (via `<Outlet />` wrapper use is optional — use `<Navigate>` + children pattern).

- [ ] **Step 1: Write failing tests for `authApi` and `useApi`**

`frontend/src/api/auth.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authApi } from './auth';
import { clearStoredToken, setStoredToken } from './client';

afterEach(() => {
  vi.restoreAllMocks();
  clearStoredToken();
});

describe('authApi', () => {
  it('login posts credentials and stores no token itself', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { token: 't1', user: { id: 'u1', name: 'A', email: 'a@b.c', role: 'student' } } }),
    } as unknown as Response);
    const res = await authApi.login('a@b.c', 'secret1');
    expect(res.user.email).toBe('a@b.c');
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body).toEqual({ email: 'a@b.c', password: 'secret1' });
  });

  it('verifyOtp posts email and otp', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { message: 'verified' } }),
    } as unknown as Response);
    const res = await authApi.verifyOtp('a@b.c', '123456');
    expect(res.message).toBe('verified');
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/auth/verify-otp');
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ email: 'a@b.c', otp: '123456' });
  });
});
```

`frontend/src/hooks/useApi.test.ts`:

```ts
import { act, renderHook, waitFor } from '@testing-library/react';
```

When you hit this, you must add testing deps OR simplify. To keep the dependency set minimal, test `useApi` by extracting just enough logic: instead test it via a tiny React test using `@testing-library/react`. If you prefer no extra deps, skip the hook test and rely on `build`. Decision: **pin `@testing-library/react@^16` + `jsdom` as devDependencies** and set vitest environment per-file with `// @vitest-environment jsdom` pragma at the top of `useApi.test.ts`. Add these to package.json devDependencies in Step 0 of this task.

Test body:

```ts
// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useApi } from './useApi';

describe('useApi', () => {
  it('flows through loading -> data', async () => {
    const fetcher = vi.fn().mockResolvedValue([1, 2, 3]);
    const { result } = renderHook(() => useApi<number[]>(fetcher));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([1, 2, 3]);
    expect(result.current.error).toBeNull();
  });

  it('captures error string on rejection', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useApi<number[]>(fetcher));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('boom');
  });

  it('refetch re-runs the fetcher', async () => {
    let calls = 0;
    const fetcher = vi.fn(async () => ++calls);
    const { result } = renderHook(() => useApi<number>(fetcher));
    await waitFor(() => expect(result.current.data).toBe(1));
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.data).toBe(2));
  });
});
```

- [ ] **Step 2: Add devDependencies `@testing-library/react` and `jsdom`**

Run (workdir `frontend`): `npm install -D @testing-library/react@^16 jsdom@^25`
Then add `environmentMatchGlobs: [['**/*.test.tsx', 'jsdom']]` — simpler: use the `// @vitest-environment jsdom` pragma as above, no config change needed.

- [ ] **Step 3: Run tests to verify they fail**

Run (workdir `frontend`): `npm test`
Expected: FAIL — modules missing.

- [ ] **Step 4: Implement `frontend/src/api/auth.ts`**

```ts
import { apiFetch } from './client';
import type { AuthUser } from '../types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  collegeId: string;
  rollNumber: string;
  studentType: 'frp' | 'erp';
  department: string;
}

export const authApi = {
  login(email: string, password: string) {
    return apiFetch<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },
  register(payload: RegisterPayload) {
    return apiFetch<{ token: string; user: AuthUser; message: string }>('/auth/register', {
      method: 'POST',
      body: payload,
    });
  },
  verifyOtp(email: string, otp: string) {
    return apiFetch<{ message: string }>('/auth/verify-otp', {
      method: 'POST',
      body: { email, otp },
    });
  },
  me() {
    return apiFetch<AuthUser & { profile?: unknown }>('/auth/me');
  },
  changePassword(currentPassword: string, newPassword: string) {
    return apiFetch<{ message: string }>('/auth/change-password', {
      method: 'PUT',
      body: { currentPassword, newPassword },
    });
  },
};
```

- [ ] **Step 5: Implement `frontend/src/hooks/useApi.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcherRef
      .current()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick, ...deps]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { data, loading, error, refetch };
}
```

- [ ] **Step 6: Implement `frontend/src/context/AuthContext.tsx`**

```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth';
import { clearStoredToken, getStoredToken, setStoredToken } from '../api/client';
import type { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  initializing: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  reload: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  const reload = useCallback(async () => {
    if (!getStoredToken()) {
      setUser(null);
      return;
    }
    try {
      const me = await authApi.me();
      setUser({ id: me.id, name: me.name, email: me.email, role: me.role, isActive: me.isActive });
    } catch {
      clearStoredToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    reload().finally(() => setInitializing(false));
  }, [reload]);

  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setStoredToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, initializing, login, logout, reload }),
    [user, initializing, login, logout, reload]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 7: Implement `frontend/src/hooks/useAuth.ts`** (re-export for convenience)

```ts
export { useAuth } from '../context/AuthContext';
```

- [ ] **Step 8: Implement `frontend/src/components/shared/ProtectedRoute.tsx`**

```tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/auth/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return null;
}
```

Note: this task does NOT depend on the `Spinner` UI component (created in Task 4). The inline `Loading…` fallback above is final — keep it simple.

- [ ] **Step 9: Run tests, lint, build**

Run (workdir `frontend`): `npm test`, then `npm run lint`, then `npm run build`
Expected: 10+ tests pass, lint clean, build passes.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/context frontend/src/hooks frontend/src/api/auth.ts frontend/src/components/shared/ProtectedRoute.tsx frontend/package.json
git commit -m "feat(frontend): add auth context, useApi hook, and route guard"
```

---

### Task 4: UI primitives

**Files:**
- Create: `frontend/src/components/ui/Button.tsx`
- Create: `frontend/src/components/ui/Input.tsx`
- Create: `frontend/src/components/ui/Select.tsx`
- Create: `frontend/src/components/ui/Card.tsx`
- Create: `frontend/src/components/ui/Table.tsx`
- Create: `frontend/src/components/ui/Badge.tsx`
- Create: `frontend/src/components/ui/Modal.tsx`
- Create: `frontend/src/components/ui/Tabs.tsx`
- Create: `frontend/src/components/ui/Pagination.tsx`
- Create: `frontend/src/components/ui/Skeleton.tsx`
- Create: `frontend/src/components/ui/Alert.tsx`
- Create: `frontend/src/components/ui/EmptyState.tsx`
- Create: `frontend/src/components/ui/Spinner.tsx`
- Create: `frontend/src/components/shared/PageHeader.tsx`

**Interfaces:**
- Produces (exact signatures used across all page tasks):

```
Button:
  - Button({ variant?: 'primary'|'secondary'|'danger'; size?: 'sm'|'md'; className?: string; type?: 'button'|'submit'; disabled?: boolean; onClick?; children })
  - ButtonLink({ to: string; variant?: ...; children }) — renders <Link className=...>
Input:
  - Input({ id?: string; label?: string; error?: string; hint?: string; className?: string; ...rest: InputHTMLAttributes })
Select:
  - Select({ id?: string; label?: string; error?: string; options: { value: string; label: string }[]; ...rest })
Card: Card({ title?: string; actions?: React.ReactNode; padded?: boolean; children; className? })
Table:
  - Table({ columns: { key: string; header: string; className?: string }[]; children }) — <thead> grid driven by columns; body = children rows
  - TableRow({ children }) — <tr>
  - TableCell({ children; className? })
  - helper: <TableEmpty colSpan={n} message={...} />
Badge: Badge({ label: string; className?: string }) — renders span with className or default gray badge
Modal:
  - Modal({ open: boolean; onClose(): void; title?: string; children; footer?: React.ReactNode; maxWidth?: 'sm'|'md'|'lg' })
  - Provides overlay, Escape to close, click-outside close, focus on panel
Tabs:
  - Tabs({ tabs: { key: string; label: string }[]; active: string; onChange(key): void })
Pagination: Pagination({ page: number; totalPages: number; onChange(page): void })
Skeleton:
  - Skeleton({ className?: string })
  - SkeletonTable({ rows?: number; columns?: number })
  - SkeletonCards({ count?: number })
Alert: Alert({ variant?: 'info'|'success'|'error'|'warning'; children }) (also accepts `onDismiss?`)
EmptyState: EmptyState({ title: string; message?: string; action?: React.ReactNode })
Spinner: Spinner({ label?: string })
PageHeader: PageHeader({ title: string; description?: string; actions?: React.ReactNode })
```

Design tokens from the spec (exact classes):
- Primary button: `inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50`
- Secondary: `... bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 ...`
- Danger: `... bg-red-600 text-white hover:bg-red-700 ...`
- Size sm: `px-3 py-1.5 text-xs`; md: `px-4 py-2 text-sm`
- Input: `block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400`
- Input label: `block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1`
- Input error text: `mt-1 text-xs text-red-600`
- Card: `rounded-lg border border-gray-200 bg-white p-6`
- Modal overlay: `fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4`; panel `w-full max-w-lg rounded-lg bg-white p-6 shadow-lg`
- Alert error: `rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700`; success `... border-green-200 bg-green-50 text-green-700`; warning amber; info blue
- Empty state: centered `py-12 text-center`, title `text-sm font-medium text-gray-900`, message `mt-1 text-sm text-gray-500`
- Skeleton: `animate-pulse rounded bg-gray-200` (this is the ONE allowed animation)

- [ ] **Step 1: Implement each primitive component** (files above). No tests needed beyond build. Ensure:
  - `Modal` closes on `Escape` and click-outside, has `aria-modal="true"` and `role="dialog"`, traps a labelled title (`aria-labelledby`). Body scroll lock while open.
  - `Tabs` uses `role="tablist"`/`role="tab"` with `aria-selected`, keyboard arrow support optional but `tabIndex` set.
  - `Table` emits semantic `<table>`, `<thead>`, `<tbody>`.
  - `Pagination` renders Previous/Next + numbered buttons (`aria-label="Page N"`), disables at bounds, hides itself when `totalPages <= 1`.

- [ ] **Step 2: Run lint and build**

Run (workdir `frontend`): `npm run lint`, then `npm run build`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui frontend/src/components/shared/PageHeader.tsx
git commit -m "feat(frontend): add ui primitive components"
```

---

### Task 5: Application shell (layout, sidebar, header, mobile nav)

**Files:**
- Create: `frontend/src/components/layout/DashboardLayout.tsx`
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Create: `frontend/src/components/layout/Header.tsx`
- Create: `frontend/src/components/layout/MobileNav.tsx`
- Create: `frontend/src/pages/NotFoundPage.tsx`

**Interfaces:**
- Produces:
  - `export function DashboardLayout(): JSX.Element` — renders `<div class="min-h-screen bg-gray-50">` with `Sidebar` (desktop), `MobileNav` (mobile), `Header`, and `<main class="p-6">{<Outlet />}</main>`.
  - `Sidebar`: renders role-aware nav list; active link highlighted `bg-blue-50 text-blue-700` ; inactive `text-gray-600 hover:bg-gray-100 hover:text-gray-900`. Nav config:
    - student: `/student` Dashboard, `/student/profile` Profile, `/student/milestones` Milestones, `/student/courses` Courses, `/student/credits` Credits, `/student/thesis` Thesis, `/student/events` Events, `/student/deadlines` Deadlines, `/student/documents` Documents, `/student/notifications` Notifications
    - supervisor: `/supervisor` Dashboard, `/supervisor/students` My Students, `/supervisor/approvals` Approvals, `/supervisor/events` Events
    - admin: `/admin` Dashboard, `/admin/students` Students, `/admin/faculty` Faculty, `/admin/assignments` Assignments, `/admin/src-committees` SRC Committees, `/admin/forms` Forms, `/admin/deadlines` Deadlines, `/admin/events` Events, `/admin/search` Search
  - `Header`: shows page context — brand/room (role label), a user avatar/name dropdown with **Change Password** (opens modal calling `authApi.changePassword`) and **Sign out** (`logout()` → navigate `/auth/login`). No notifications bell (student notifications live on their page).
  - `MobileNav`: hamburger button visible below `lg`; opens a side drawer with the same nav lists.
  - `NotFoundPage`: `404 — Page not found` + link home.

- [ ] **Step 1: Implement layout components**

- [ ] **Step 2: Run lint and build**

Run (workdir `frontend`): `npm run lint`, `npm run build`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout frontend/src/pages/NotFoundPage.tsx
git commit -m "feat(frontend): add application shell layout"
```

---

### Task 6: Auth pages + initial routing

**Files:**
- Create: `frontend/src/pages/auth/LoginPage.tsx`
- Create: `frontend/src/pages/auth/RegisterPage.tsx`
- Create: `frontend/src/pages/auth/VerifyOtpPage.tsx`
- Modify: `frontend/src/App.tsx` (full routing with `AuthProvider`, `Routes`, `Route`)

**Auth page design:**
- Centered layout: `flex min-h-screen items-center justify-center bg-gray-50 px-4`, card `w-full max-w-md rounded-lg border border-gray-200 bg-white p-8`, heading `text-xl font-semibold text-gray-900`, sub `mt-1 text-sm text-gray-500`.
- **LoginPage:** email + password inputs, submit → `login()` → `navigate('/')` (root route redirects by role). Server error shown in `Alert variant="error"` above the form. Link under form: `New student? Register` → `/auth/register`. No forgot-password link (backend gap).
- **RegisterPage:** fields (per `authApi.register`): name, email, password, collegeId, rollNumber, studentType (`frp`/`erp`), department. On success → `navigate('/auth/verify-otp', { state: { email } })`. Show success Alert informing OTP email was sent.
- **VerifyOtpPage:** email (prefilled via location state) + otp inputs → `verifyOtp(email, otp)` → success → success Alert "Account activated" + button to `/auth/login`.
- **App.tsx:**

```tsx
import { createContext } from 'react';  // not needed
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { VerifyOtpPage } from './pages/auth/VerifyOtpPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { useAuth } from './context/AuthContext';

function Root() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth/login" replace />;
  if (user.role === 'student') return <Navigate to="/student" replace />;
  if (user.role === 'supervisor') return <Navigate to="/supervisor" replace />;
  return <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/verify-otp" element={<VerifyOtpPage />} />
          <Route
            element={
              <>
                <ProtectedRoute />
                <DashboardLayout />
              </>
            }
          >
            {/* student / supervisor / admin routes added in Tasks 7–9 */}
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

Note: Because later tasks add many routes, keep the protected `<Route>` block as the wrapper for all role pages. Each role page must itself render a guard with the correct roles at the top (see page template in Task 7).

- [ ] **Step 1: Implement the three auth pages**

- [ ] **Step 2: Implement App.tsx routing shell (with empty protected block)**

- [ ] **Step 3: Run lint and build**

Run (workdir `frontend`): `npm run lint`, `npm run build`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/auth frontend/src/App.tsx
git commit -m "feat(frontend): add auth pages and routing shell"
```

---

### Task 7: Student module

**Files:**
- Create: `frontend/src/api/student.ts`
- Create: `frontend/src/pages/student/StudentDashboard.tsx`
- Create: `frontend/src/pages/student/StudentProfile.tsx`
- Create: `frontend/src/pages/student/StudentMilestones.tsx`
- Create: `frontend/src/pages/student/StudentCourses.tsx`
- Create: `frontend/src/pages/student/StudentCredits.tsx`
- Create: `frontend/src/pages/student/StudentThesis.tsx`
- Create: `frontend/src/pages/student/StudentEvents.tsx`
- Create: `frontend/src/pages/student/StudentDeadlines.tsx`
- Create: `frontend/src/pages/student/StudentDocuments.tsx`
- Create: `frontend/src/pages/student/StudentNotifications.tsx`

**Interfaces — `frontend/src/api/student.ts` (exact paths from `backend.md`):**

```ts
export const studentApi = {
  getDashboard(): Promise<StudentDashboardData>
  getProfile(): Promise<StudentProfileView>
  updateProfile(payload: { name?: string; researchArea?: string; profilePhoto?: string }): Promise<StudentProfileView>
  getSemesters(): Promise<Semester[]>
  createSemester(payload: { semesterNumber: number; academicYear: string; startDate: string; endDate: string }): Promise<Semester>
  getCourses(semesterId: string): Promise<Course[]>
  addCourse(semesterId: string, payload: { courseCode: string; courseName: string; credits: number }): Promise<Course>
  getCredits(semesterId?: string): Promise<CreditsListResponse | Credits>
  getDocuments(): Promise<DocumentView[]>
  uploadDocument(payload: { documentName: string; documentType: string; fileUrl: string; semester?: string }): Promise<DocumentView>
  getTheses(): Promise<Thesis[]>
  submitThesis(payload: { title: string; documentUrl: string }): Promise<Thesis>
  getTimeline(): Promise<TimelineItem[]>
  getMilestones(): Promise<Milestone[]>
  getEvents(upcoming?: boolean): Promise<EventView[]>
  getDeadlines(upcoming?: boolean): Promise<Deadline[]>
  getForms(): Promise<Form[]>
  getNotifications(): Promise<Notification[]>
  markNotificationRead(id: string): Promise<Notification>
};
```

`StudentDashboardData`:
```ts
export interface StudentDashboardData {
  profile: StudentProfileView;
  currentSemester: Semester | null;
  credits: CreditsSummary;
  milestones: Milestone[];
  nextMilestone: Milestone | null;
  upcomingDeadlines: Deadline[];
  upcomingEvents: EventView[];
  pendingCourseRequests: StudentCourse[];
  thesis: Thesis | null;
  unreadNotifications: number;
}
```

**API path map (URL templates — use `apiFetch`):**
- GET `/student/dashboard`
- GET `/student/profile` | PUT `/student/profile`
- GET `/student/semesters` | POST `/student/semesters`
- GET `/student/semesters/:semesterId/courses` | POST `/student/semesters/:semesterId/courses`
- GET `/student/credits` (optionally `?semesterId=`)
- GET `/student/documents` | POST `/student/documents`
- GET `/student/thesis` | POST `/student/thesis`
- GET `/student/timeline`
- GET `/student/milestones`
- GET `/student/events` (`{ query: { upcoming } }`)
- GET `/student/deadlines` (`{ query: { upcoming } }`)
- GET `/student/forms`
- GET `/student/notifications` | PUT `/student/notifications/:id/read`

**Page design requirements (each page):**
1. Wrap content in `<Card>`; every data fetch via `useApi`; render the three states:
   - `loading` → `<SkeletonTable />` or `<SkeletonCards />`
   - `error` → `<Alert variant="error">{error}</Alert>` + retry `<Button onClick={refetch}>Try again</Button>`
   - empty → `<EmptyState title="..." message="..." />` (+ action when creating is possible on the page)
2. Role guard at top: `if (user?.role !== 'student') return <Navigate to="/" replace />;` (import `useAuth`).

**Page specs:**

- **StudentDashboard:** Use `studentApi.getDashboard()` (single request, no duplication). Build:
  - Stat row: 4 `<Card>`s — `Credits` (`earned/required`, `remaining` smaller), `Milestones` (`completedCount/11`, where completed = `status === 'completed'`), `Upcoming Deadlines` (count), `Unread Notifications` (count → link to notifications). Use `grid gap-4 sm:grid-cols-2 lg:grid-cols-4`.
  - Next milestone banner (read-only): title + description + status badge.
  - Milestones progress: horizontal stepper — `grid grid-cols-11` on ≥lg, vertical list on mobile; completed nodes `bg-green-500 text-white`? NO — keep restrained. Completed = `bg-blue-600 text-white`, pending = `bg-gray-200 text-gray-500`, current = ring. Simpler + professional: a bar `h-2 rounded bg-gray-200` with `bg-blue-600` fill = completed/11, plus a small legend of first 3 next steps. Choose the simple bar to avoid gaudiness. Add "View all" → `/student/milestones`.
  - Two-column: `Upcoming Deadlines` (Table: Title, Due date `formatDate`, Days left → `daysUntil` + "overdue" red if negative) and `Upcoming Events` (list of title + `formatDate` + type `Badge`).
  - `Pending Course Requests` table (course name, code, credits) only when non-empty; `Thesis` status card.
  
- **StudentProfile:** Read `studentApi.getProfile()`. Display profile fields in definition list: name, email, collegeId, rollNumber, studentType (label via `STUDENT_TYPE_LABELS`), department, researchArea, admissionDate, requiredCredits, supervisor (name) / coSupervisor (name) or "Not assigned". Edit modal with fields name, researchArea, profilePhoto → `updateProfile`; success → reload. Also here: SRC committee card if `srcCommittee` present (members list with role labels).

- **StudentMilestones:** `Tabs`: "Milestone Checklist" | "Degree Timeline".
  - Checklist: vertical list of 11 milestones. Each row: order number, title, `Badge` (status via `MILESTONE_STATUS_STYLE`), due date (if any), completed date. Read-only (backend gap — no supervisor write UI).
  - Degree Timeline: `studentApi.getTimeline()`; render items sorted as returned; `type === 'semester'` → semester header card; `type === 'course'` → row with courseCode, courseName, credits, status badge.

- **StudentCourses:** List semesters (once from `getSemesters()`); select an active semester (tabs or select). Show its courses (`studentApi.getCourses(semesterId)`). Two actions:
  - "Add Semester" modal: semesterNumber, academicYear, startDate, endDate → `createSemester` → refetch semesters.
  - "Request Course" modal: courseCode, courseName, credits → `addCourse` → refetch courses.
  - Course rows: code, name, credits, status badge + supervisor comment when rejected.

- **StudentCredits:** `getCredits()` → table of `semesters` (each: semester number/year, `earnedCredits`) + total earned + required (from profile `requiredCredits`) + remaining (required - earned). Optional semester filter not needed (aggregate view is fine); keep URL `?semesterId` unused unless a semester is selected — behind a Select filter that refetches.

- **StudentThesis:** `getTheses()` → table of versions: version, title, status badge (`THESIS_STATUS_STYLE`), submission date, supervisor comments (small muted block when present). "Submit Thesis" modal: title + documentUrl → `submitThesis` → refetch.

- **StudentEvents:** `getEvents(upcoming?)` with an "Upcoming" / "All" toggle (Tabs). Table/cards: title, type badge (`EVENT_TYPE_LABELS`), `formatDate`, location, organizer. No RSVP — backend has none.

- **StudentDeadlines:** `getDeadlines(upcoming?)` with the same toggle. Table: title, description, `formatDate(dueDate)`, days remaining. 

- **StudentDocuments:** `Tabs`: "Documents" | "Forms".
  - Documents: table of name, type, `formatDate(uploadDate)`, status badge (approvalStatus), link "Open" (`<a href={fileUrl} target="_blank" rel="noreferrer">`). "Upload Document" modal: documentName, documentType, fileUrl, semester (optional) → `uploadDocument` → refetch.
  - Forms: `getForms()` table of formName, formType, "Open form" link.

- **StudentNotifications:** `getNotifications()` → list; each row: title, message, `formatDateTime(createdAt)`, unread highlighted with `bg-blue-50`; click marks read (`markNotificationRead`), navigating to `link` if present. "Mark all read" is NOT available (no bulk endpoint) — iterate marks individually or omit. Show unread count in heading.

**App.tsx wiring for student routes (append to the protected block):**

```tsx
<Route path="/student" element={<ProtectedRoute roles={['student']} />}>
  <Route index element={<StudentDashboard />} />
  <Route path="profile" element={<StudentProfile />} />
  <Route path="milestones" element={<StudentMilestones />} />
  <Route path="courses" element={<StudentCourses />} />
  <Route path="credits" element={<StudentCredits />} />
  <Route path="thesis" element={<StudentThesis />} />
  <Route path="events" element={<StudentEvents />} />
  <Route path="deadlines" element={<StudentDeadlines />} />
  <Route path="documents" element={<StudentDocuments />} />
  <Route path="notifications" element={<StudentNotifications />} />
</Route>
```

Note: `ProtectedRoute` returns `null` on success — nest actual page elements as children inside the `Route` element hierarchy so the layout (`DashboardLayout` via the parent `<Route element={<>...}</Route>`) wraps them. Structure must be:

```tsx
<Route element={<><ProtectedRoute /><DashboardLayout /></>}>
  <Route path="/student" element={<ProtectedRoute roles={['student']} />}>
    <Route index element={<StudentDashboard />} />
    ...
  </Route>
</Route>
```

- [ ] **Step 1: Implement `frontend/src/api/student.ts`** and add `StudentDashboardData` to `frontend/src/types/index.ts`.

- [ ] **Step 2: Implement StudentDashboard + StudentProfile**

- [ ] **Step 3: Implement StudentMilestones + StudentCourses + StudentCredits**

- [ ] **Step 4: Implement StudentThesis + StudentEvents + StudentDeadlines**

- [ ] **Step 5: Implement StudentDocuments + StudentNotifications**

- [ ] **Step 6: Wire student routes into `App.tsx`**

- [ ] **Step 7: Run lint, build, test**

Run (workdir `frontend`): `npm run lint`, `npm run build`, `npm test`
Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/api/student.ts frontend/src/pages/student frontend/src/App.tsx frontend/src/types/index.ts
git commit -m "feat(frontend): add student module pages"
```

---

### Task 8: Supervisor module

**Files:**
- Create: `frontend/src/api/supervisor.ts`
- Create: `frontend/src/pages/supervisor/SupervisorDashboard.tsx`
- Create: `frontend/src/pages/supervisor/StudentList.tsx`
- Create: `frontend/src/pages/supervisor/StudentDetail.tsx`
- Create: `frontend/src/pages/supervisor/Approvals.tsx`
- Create: `frontend/src/pages/supervisor/SupervisorEvents.tsx`

**Interfaces — `frontend/src/api/supervisor.ts`:**

```ts
export const supervisorApi = {
  getDashboard(): Promise<SupervisorDashboardData>
  getStudents(params: { name?: string; rollNumber?: string; semester?: string; studentType?: string; researchArea?: string; page?: number; limit?: number }): Promise<{ students: StudentListItem[]; pagination: Pagination }>
  getStudentOptions(): Promise<StudentOption[]>
  getStudentDetail(studentId: string): Promise<SupervisorStudentDetail>
  approveCourse(studentCourseId: string, payload: { status: 'approved' | 'rejected'; comment?: string }): Promise<unknown>
  approveThesis(thesisId: string, payload: { status: 'approved' | 'rejected' | 'resubmission_required'; comment?: string }): Promise<unknown>
  approveRequest(requestId: string, payload: { status: 'approved' | 'rejected'; comment?: string }): Promise<unknown>
  getPendingApprovals(): Promise<PendingApprovals>
  createEvent(payload: SupervisorEventPayload): Promise<EventView>
  getEvents(params: { page?: number; limit?: number; eventType?: string }): Promise<{ events: EventView[]; pagination: Pagination }>
};
```

Additional types (add to `frontend/src/types/index.ts`):

```ts
export interface StudentListItem extends StudentProfileView { }
export interface SupervisorDashboardData {
  assignedStudents: number;
  pendingApprovals: number;
  upcomingEvents: number;
  pendingCourseApprovals: number;
  pendingThesisApprovals: number;
  pendingGeneralApprovals: number;
}
export interface SupervisorStudentDetail {
  profile: StudentProfileView;
  semesters: Semester[];
  courses: StudentCourse[];
  documents: DocumentView[];
  theses: Thesis[];
  srcCommittee: SRCCommittee | null;
  timeline: { semester: Semester; courses: StudentCourse[]; credits: Credits | null }[];
  totalCredits: CreditsSummary;
}
export interface SupervisorEventPayload {
  title: string;
  eventType: EventType;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  participants: string[];
  semester?: string;
  deadline?: string;
}
```

**API path map:**
- GET `/supervisor/dashboard`
- GET `/supervisor/students` (query: name, rollNumber, semester, studentType, researchArea, page, limit)
- GET `/supervisor/students/options`
- GET `/supervisor/students/:studentId`
- PUT `/supervisor/courses/:studentCourseId/approve` — body `{ status, comment }`
- PUT `/supervisor/thesis/:thesisId/approve` — body `{ status, comment }`
- PUT `/supervisor/approvals/:requestId/approve` — body `{ status, comment }`
- GET `/supervisor/approvals/pending`
- POST `/supervisor/events` — body per `SupervisorEventPayload`
- GET `/supervisor/events` (query: page, limit, eventType)

**Page specs:**

- **SupervisorDashboard:** `getDashboard()` → 6 stat cards (`assignedStudents`, `pendingApprovals`, `upcomingEvents`, plus breakdown course/thesis/general). Link cards to relevant pages. Loading → skeleton.

- **StudentList:** table with **side filters** (name search debounced, rollNumber, semester, studentType Select, researchArea) + pagination. Columns: Name (from `student.user.name`), Roll Number, Department, Student Type badge (`STUDENT_TYPE_LABELS`), Research Area. Row click → `/supervisor/students/:id` (use `useNavigate`). Debounce search: `useEffect` + `setTimeout` 300ms.

- **StudentDetail:** `getStudentDetail(:id)`. Header: name, rollNumber, `Badge` studentType. `Tabs`: Profile | Academics | Documents | Thesis | SRC.
  - Profile: definition list (collegeId, department, researchArea, admissionDate, requiredCredits, supervisor, coSupervisor).
  - Academics: for each semester (`timeline`), a `Card` with semester header + its courses (code, name, credits, status badge) + credits summary.
  - Documents: as student docs table (read-only).
  - Thesis: versions table with `Approve`/`Reject`/`Request resubmission` buttons per SUBMITTED/UNDER_REVIEW version → `approveThesis` modal with optional comment → success reloads + `Alert`.
  - SRC: committee members (faculty name + role label) or EmptyState.

- **Approvals:** `getPendingApprovals()` → 3 sections (Course / Thesis / General). Each item: student name, item details, approve/reject buttons (modal with comment) → `approveCourse` / `approveThesis` / `approveRequest` → refetch + success `Alert`. EmptyState when everything is reviewed ("No pending approvals").

- **SupervisorEvents:** list `getEvents()` (table: title, type, date, location, participant count). "Create Event" modal: title, eventType Select (from `EVENT_TYPE_LABELS` keys), description, date (date input), startTime/endTime (datetime-local), location, semester (optional), deadline (optional), participants multi-select from `getStudentOptions()` (fetch options when modal opens). Submit → `createEvent` → refetch + success Alert. Deadline toggle: admin uses no semester; supervisor uses optional semester — differentiate in this component.

- **App.tsx wiring:**

```tsx
<Route path="/supervisor" element={<ProtectedRoute roles={['supervisor']} />}>
  <Route index element={<SupervisorDashboard />} />
  <Route path="students" element={<StudentList />} />
  <Route path="students/:studentId" element={<StudentDetail />} />
  <Route path="approvals" element={<Approvals />} />
  <Route path="events" element={<SupervisorEvents />} />
</Route>
```

- [ ] **Step 1: Implement `frontend/src/api/supervisor.ts`** + add the new types to `frontend/src/types/index.ts`.

- [ ] **Step 2: Implement SupervisorDashboard + StudentList**

- [ ] **Step 3: Implement StudentDetail (tabs)**

- [ ] **Step 4: Implement Approvals + SupervisorEvents**

- [ ] **Step 5: Wire supervisor routes into `App.tsx`**

- [ ] **Step 6: Run lint, build, test**

Run (workdir `frontend`): `npm run lint`, `npm run build`, `npm test`
Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/api/supervisor.ts frontend/src/pages/supervisor frontend/src/App.tsx frontend/src/types/index.ts
git commit -m "feat(frontend): add supervisor module pages"
```

---

### Task 9: Admin module

**Files:**
- Create: `frontend/src/api/admin.ts`
- Create: `frontend/src/pages/admin/AdminDashboard.tsx`
- Create: `frontend/src/pages/admin/StudentManagement.tsx`
- Create: `frontend/src/pages/admin/FacultyManagement.tsx`
- Create: `frontend/src/pages/admin/SupervisorAssignment.tsx`
- Create: `frontend/src/pages/admin/SrcCommitteeManagement.tsx`
- Create: `frontend/src/pages/admin/FormManagement.tsx`
- Create: `frontend/src/pages/admin/DeadlineManagement.tsx`
- Create: `frontend/src/pages/admin/EventManagement.tsx`
- Create: `frontend/src/pages/admin/GlobalSearch.tsx`

**Interfaces — `frontend/src/api/admin.ts`:**

```ts
export const adminApi = {
  getDashboard(): Promise<AdminDashboardData>
  listStudents(params: { search?: string; studentType?: string; department?: string; page?: number; limit?: number }): Promise<{ students: StudentProfileView[]; pagination: Pagination }>
  createStudent(payload: AdminCreateStudent): Promise<{ user: AuthUser; profile: StudentProfileView }>
  updateStudent(id: string, payload: Record<string, unknown>): Promise<StudentProfileView>
  toggleStudentActive(userId: string): Promise<{ id: string; isActive: boolean }>
  listFaculty(params: { search?: string; department?: string; page?: number; limit?: number }): Promise<{ faculty: FacultyView[]; pagination: Pagination }>
  createFaculty(payload: AdminCreateFaculty): Promise<{ user: AuthUser; profile: FacultyView }>
  updateFaculty(id: string, payload: Record<string, unknown>): Promise<FacultyView>
  toggleFacultyActive(userId: string): Promise<{ id: string; isActive: boolean }>
  assignSupervisor(payload: { studentId: string; supervisorId: string; coSupervisorId?: string }): Promise<unknown>
  createSRCCommittee(payload: { studentId: string; members: { faculty: string; role: SRCMemberRole }[] }): Promise<unknown>
  updateSRCCommittee(id: string, members: { faculty: string; role: SRCMemberRole }[]): Promise<unknown>
  listEvents(params: { page?: number; limit?: number }): Promise<{ events: EventView[]; pagination: Pagination }>
  createEvent(payload: AdminEventPayload): Promise<EventView>
  updateEvent(id: string, payload: Record<string, unknown>): Promise<EventView>
  deleteEvent(id: string): Promise<{ message: string }>
  listForms(params: { page?: number; limit?: number }): Promise<{ forms: Form[]; pagination: Pagination }>
  createForm(payload: FormFields): Promise<Form>
  updateForm(id: string, payload: Record<string, unknown>): Promise<Form>
  deleteForm(id: string): Promise<{ message: string }>
  listDeadlines(params: { page?: number; limit?: number }): Promise<{ deadlines: Deadline[]; pagination: Pagination }>
  createDeadline(payload: DeadlineFields): Promise<Deadline>
  globalSearch(q: string): Promise<{ students: unknown[]; faculty: unknown[] }>
};
```

New types to add:

```ts
export interface AdminDashboardData { totalStudents: number; totalFaculty: number; totalEvents: number; pendingApprovals: number; }
export interface AdminCreateStudent { email: string; password: string; name: string; collegeId: string; rollNumber: string; studentType: StudentType; department: string; researchArea?: string; admissionDate?: string; requiredCredits?: number; }
export interface AdminCreateFaculty { email: string; password: string; name: string; employeeId: string; department: string; designation: string; researchAreas?: string[]; }
export interface FacultyView { _id: string; user: UserShort; employeeId: string; department: string; designation: string; researchAreas: string[]; profilePhoto?: string; }
export interface AdminEventPayload { title: string; eventType: EventType; description?: string; date: string; startTime: string; endTime: string; location?: string; participants: string[]; deadline?: string; }
export interface FormFields { formName: string; formType: string; fileUrl: string; semesterApplicable?: number[]; studentTypeApplicable?: StudentType[]; department?: string; }
export interface DeadlineFields { title: string; description?: string; dueDate: string; semester?: string; student?: string; }
```

**API path map:**
- GET `/admin/dashboard`
- POST `/admin/students` | GET `/admin/students` (query: search, studentType, department, page, limit) | PUT `/admin/students/:id` | PUT `/admin/students/:id/toggle-active` (**id = User id** — list items populate `user`, use `student.user._id`)
- POST `/admin/faculty` | GET `/admin/faculty` | PUT `/admin/faculty/:id` | PUT `/admin/faculty/:id/toggle-active` (**id = User id**)
- POST `/admin/supervisor/assign`
- POST `/admin/src-committee` | PUT `/admin/src-committee/:id`
- POST `/admin/events` | GET `/admin/events` | PUT `/admin/events/:id` | DELETE `/admin/events/:id`
- GET `/admin/forms` | POST `/admin/forms` | PUT `/admin/forms/:id` | DELETE `/admin/forms/:id`
- GET `/admin/deadlines` | POST `/admin/deadlines`
- GET `/admin/search?q=`

**Page specs:**

- **AdminDashboard:** `getDashboard()` → 4 stat cards + quick-action `ButtonLink`s (Create Student → `/admin/students` with `?create=1`, Create Faculty, Create Event, Create Deadline).

- **StudentManagement:** Search input (debounced) + filters (studentType, department) + `Pagination`. Table: Name, Roll Number, College ID, Type badge, Status (Active/Inactive from `user.isActive`), Actions (Edit, Activate/Deactivate via `toggleStudentActive(user._id)`, confirm via `window.confirm` NOT allowed — use `Modal` confirmation). "Add Student" button opens modal (`?create=1` pre-opens it): fields per `AdminCreateStudent`, plus optional `requiredCredits` (number, hint: "20 for direct-admission PhD; defaults to 12"), `admissionDate` (date input), `researchArea`. Edit modal: name, email, collegeId, rollNumber, studentType, department, researchArea, profilePhoto → `updateStudent(profileId, ...)`.

- **FacultyManagement:** mirror of students: search + department filter + pagination; table Name, Employee ID, Department, Designation, Status, Actions (Edit / Toggle active). Create/Edit modal per `AdminCreateFaculty`.

- **SupervisorAssignment:** Two selects loaded from `listStudents` (all pages, or a page + search) and `listFaculty`; selects for supervisor + optional co-supervisor; submit → `assignSupervisor`. Show a hint about replacing existing assignment.

- **SrcCommitteeManagement:** student select (search) → shows existing committee if present (from that student's profile via fetch or a listStudents match). Create form: member rows `{ faculty: Select, role: Select }` (roles: chairperson|supervisor|co_supervisor|member) → `createSRCCommittee`; if a committee exists, switch to "Edit members" mode → `updateSRCCommittee`. Validation client-side: exactly one chairperson.

- **FormManagement:** table (formName, formType, semesterApplicable, studentTypeApplicable) + Create/Edit/Delete (confirm modal). Fields per `FormFields`.

- **DeadlineManagement:** table (title, description, dueDate, scope badge: "Global" if no student+semester, otherwise "Semester"/"Student") + Create modal per `DeadlineFields`. Optional `semester`/`student` selects are optional — leave blank for global.

- **EventManagement:** table (title, type, date, location, participant count) + Create/Edit/Delete. Create/Edit modal: title, eventType, description, date, startTime, endTime, location, participants (multi from `getStudentOptions` is supervisor-only → use `listStudents({ limit: 100 })` and map profile ids to participant ids). NO `semester` field (admin createEvent does not accept it). Delete confirms via Modal.

- **GlobalSearch:** input + submit → `globalSearch(q)` → two result lists (Students, Faculty) with name/roll/collegeId/email/employeeId; each row links to the matching management page.

- **App.tsx wiring:**

```tsx
<Route path="/admin" element={<ProtectedRoute roles={['admin']} />}>
  <Route index element={<AdminDashboard />} />
  <Route path="students" element={<StudentManagement />} />
  <Route path="faculty" element={<FacultyManagement />} />
  <Route path="assignments" element={<SupervisorAssignment />} />
  <Route path="src-committees" element={<SrcCommitteeManagement />} />
  <Route path="forms" element={<FormManagement />} />
  <Route path="deadlines" element={<DeadlineManagement />} />
  <Route path="events" element={<EventManagement />} />
  <Route path="search" element={<GlobalSearch />} />
</Route>
```

- [ ] **Step 1: Implement `frontend/src/api/admin.ts`** + add new types.

- [ ] **Step 2: Implement AdminDashboard + StudentManagement**

- [ ] **Step 3: Implement FacultyManagement + SupervisorAssignment**

- [ ] **Step 4: Implement SrcCommitteeManagement + FormManagement**

- [ ] **Step 5: Implement DeadlineManagement + EventManagement + GlobalSearch**

- [ ] **Step 6: Wire admin routes into `App.tsx`**

- [ ] **Step 7: Run lint, build, test**

Run (workdir `frontend`): `npm run lint`, `npm run build`, `npm test`
Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/api/admin.ts frontend/src/pages/admin frontend/src/App.tsx frontend/src/types/index.ts
git commit -m "feat(frontend): add admin module pages"
```

---

### Task 10: Routing completion, lazy loading, and polish

**Files:**
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/components/shared/LazyPage.tsx` (optional helper)
- Modify: `frontend/src/index.html` (title/meta polish if needed)

**Work:**
- Convert all page imports to `React.lazy(() => import(...))` with a `Suspense` boundary wrapping the routed content (`fallback={<Skeleton />}`). Keep `LoginPage/RegisterPage/VerifyOtpPage` eager (critical path).
- Confirm every route in the spec roadmap exists and redirects behave.
- Add `ErrorBoundary` (small class component `src/components/shared/ErrorBoundary.tsx`) wrapping `Routes` — catches render errors, shows a friendly `Alert` + reload button (no technical messages).
- Final `Root()` route completes the "logged-in redirect" behavior.

- [ ] **Step 1: Implement lazy loading + ErrorBoundary + Suspense**

- [ ] **Step 2: Run lint, build, test**

Run (workdir `frontend`): `npm run lint`, `npm run build`, `npm test`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/shared/ErrorBoundary.tsx frontend/src/components/shared/LazyPage.tsx
git commit -m "feat(frontend): add lazy loading and error boundary"
```

---

### Task 11: Verification & manual smoke checklist (done by subset of agents)

**Commands (workdir `frontend`):**
- `npm run lint` — clean
- `npm run typecheck` — clean
- `npm run build` — clean, `dist/` produced
- `npm test` — all unit tests pass

**Manual/integration notes (documented for the human):**
- Start backend (`npm run dev` in repo root needs MongoDB; or use a running instance).
- `npm run dev` in `frontend/` then open http://localhost:5173 (dev proxy forwards `/api` to `:5000`).
- Verify: register → OTP email (logged to console if no SMTP) → verify → login → role dashboards; admin create student/faculty/event/deadline; supervisor approvals; student milestone checklist.

**Backend gap report (include in final summary to user):**
1. No read endpoint for supervisor/admin to view a student's milestones → supervisor/admin milestone editing UI was not built.
2. Forgot/reset password routes do not exist → no forgot-password link in UI.
3. Admin has no semester/course management routes → no admin pages for them.
4. File uploads require pre-uploaded `fileUrl` strings (object storage) — forms collect URLs.

- [ ] **Step 1: Run all verification commands and report results**

- [ ] **Step 2: Write the final gap/notes summary (can be a comment in the commit or README section)**

---

### Task 12 (review gates, executed by the orchestrator, not in a single plan task):

After Task 11, the orchestrator MUST dispatch these reviewers (subagents) and fix their findings before declaring done:

1. **Aesthetic reviewer** — check every page against spec design tokens; flag gradients, glows, heavy shadows, excessive rounded corners, inconsistent spacing, misalignment, clutter. Fix findings.
2. **Performance reviewer** — verify lazy loading is real, no duplicate `useApi` fetches, no unbounded list rendering (all lists paginated), no heavy deps, debounced searches, no `index` keys on dynamic lists, minimal bundle. Fix findings. Check `npm run build` output size.
3. **Code-quality reviewer** — naming, duplication, component boundaries, `noUnusedLocals`, strict typing, no `any` leakage beyond API payloads, consistent error handling. Fix findings.
4. **Accessibility reviewer** — `Modal` focus trap/escape, form labels, table semantics, contrast, keyboard nav for tabs/pagination/sidebar, focus-visible states, `alt`/ARIA correctness. Fix findings.

Each reviewer returns a findings list; orchestrator fixes accepted findings and re-verifies with lint/build/test.

---

## Self-Review Notes

- **Spec coverage:** auth pages ✓ (Task 6), student pages ✓ (Task 7), supervisor pages ✓ (Task 8), admin pages ✓ (Task 9), design system ✓ (Task 4), routing ✓ (Tasks 6–10), API integration ✓ (all API tasks use `backend.md` paths verbatim). Spec's `/student/timeline` is folded into StudentMilestones ("Degree Timeline" tab) as designed in the brainstorm.
- **Deviations from spec that are REQUIRED by backend reality (documented above):** admin semesters/courses pages removed; supervisor/admin milestone editing removed; forgot-password omitted. All three are explicitly "backend gaps, not inventable".
- **Type consistency:** `Pagination` used across all list APIs; `StudentProfileView` etc. used consistently; `apiFetch<T>` envelope unwrap used everywhere.
- **Placeholders:** none — each task lists exact files, interfaces, URLs, and verification commands.