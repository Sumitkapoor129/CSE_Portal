# Task 1 Brief: Scaffold the frontend project

Full plan: `docs/superpowers/plans/2026-09-08-frontend-implementation.md`
Spec (design/API mapping): `docs/superpowers/specs/2026-09-08-frontend-design.md`

IMPORTANT REPO RULES:
- This repo has NO git. Do NOT run `git add`/`git commit`/`git init`. Skip the plan's commit step.
- Work from repo root `C:\Users\91983\Desktop\VibeCoded\CSE_portal`. Create everything under `frontend/`.
- NEVER add code comments. No emoji. Professional/minimal design.
- Tailwind CSS v4 via `@tailwindcss/vite` plugin only — NO `tailwind.config.js`, NO `postcss.config.js`.

## Goal
Scaffold the Vite + React 19 + TypeScript (strict) + Tailwind v4 + React Router v6 + Vitest frontend project with lint and build passing.

## Files (all exactly as specified below)

1. `frontend/package.json` — exact JSON below (name, scripts, dependencies). `type: "module"`.
2. `frontend/tsconfig.json` — root project refs file.
3. `frontend/tsconfig.app.json` — strict app config (`include: ["src"]`).
4. `frontend/tsconfig.node.json` — for `vite.config.ts` and `eslint.config.js`.
5. `frontend/vite.config.ts` — react + tailwindcss plugins; server port 5173; proxy `/api` → `http://localhost:5000`; vitest `test` block (`environment: 'node'`, include `src/**/*.test.ts`).
6. `frontend/eslint.config.js` — flat config (js + typescript-eslint recommended + eslint-plugin-react-hooks).
7. `frontend/index.html` — lang="en", title "CSE PhD Portal | NIT Jamshedpur", root div, module script `/src/main.tsx`.
8. `frontend/.env.example` — `VITE_API_URL=http://localhost:5000/api`.
9. `frontend/.gitignore` — `node_modules`, `dist`, `.env`, `*.local`.
10. `frontend/src/index.css` — `@import "tailwindcss";` + base layer: `body { @apply bg-gray-50 text-gray-900 antialiased; }` and `:focus-visible { @apply outline-2 outline-offset-2 outline-blue-600; }`.
11. `frontend/src/vite-env.d.ts` — `/// <reference types="vite/client" />` AND `/// <reference types="vitest/config" />`.
12. `frontend/src/main.tsx` — StrictMode + createRoot render of `App`.
13. `frontend/src/App.tsx` — TEMPORARY placeholder: `<main className="mx-auto max-w-3xl p-8">` with h1 "CSE PhD Scholar Portal" and subtitle "Frontend scaffolding ready." (Task 6 replaces this).
14. `frontend/src/__tests__/setup.test.ts` — trivial vitest test (`expect(1 + 1).toBe(2)`).
15. `frontend/README.md` — commands table (dev/build/preview/lint/typecheck/test) + API base URL note.

## Exact file contents

### `frontend/package.json`
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

### `frontend/tsconfig.json`
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

### `frontend/tsconfig.app.json`
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

### `frontend/tsconfig.node.json`
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

### `frontend/vite.config.ts`
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

### `frontend/eslint.config.js`
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

### `frontend/index.html`
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

### `frontend/.env.example`
```
VITE_API_URL=http://localhost:5000/api
```

### `frontend/.gitignore`
```
node_modules
dist
.env
*.local
```

### `frontend/src/index.css`
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

### `frontend/src/vite-env.d.ts`
```ts
/// <reference types="vite/client" />
/// <reference types="vitest/config" />
```

### `frontend/src/main.tsx`
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

### `frontend/src/App.tsx` (temporary — Task 6 replaces)
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

### `frontend/src/__tests__/setup.test.ts`
```ts
import { describe, expect, it } from 'vitest';

describe('scaffold', () => {
  it('runs the test runner', () => {
    expect(1 + 1).toBe(2);
  });
});
```

### `frontend/README.md`
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

## Verification (REQUIRED — run all three and report exact output)
Workdir `frontend`:
```bash
npm install
npm run lint
npm test
npm run build
```
Expected: `npm run lint` clean (no errors/warnings), `npm test` shows 1 passing test, `npm run build` succeeds (`tsc -b && vite build`) and emits `dist/`. `npm run typecheck` should also pass.

If any command fails, fix the cause (do NOT weaken the plan's config) and re-run until green.

## Report back
State, in your final message:
1. Files created (full list).
2. Output of each verification command (pass/fail + key lines).
3. Any deviations from the brief and why.
4. Exact list of produced file paths for review.