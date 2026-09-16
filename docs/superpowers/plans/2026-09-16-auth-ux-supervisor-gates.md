# Auth & UX Feature Set Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement eight approved features: clearer auth errors (F1), show-password toggle (F2), sequential semester creation (F3), supervisor-required academic actions (F4), responsive logout + sidebar identity (F5), profile photo display (F6), post-registration onboarding wizard (F7), and refresh/access token sessions (F8).

**Architecture:** Backend Express/TS adds structured auth errors, a supervisor gate, a `RefreshToken` model with access/refresh token rotation, new `/auth/refresh` + `/auth/logout` routes, extra student profile fields, and `profilePhoto` on auth responses. Frontend adds a `PasswordInput` + `Avatar` shared component, a viewport-safe header dropdown, an onboarding wizard page, and a single-flight refresh-aware fetch client. RBAC roles unchanged.

**Tech Stack:** Node/Express/TypeScript/Mongoose 8, jsonwebtoken, crypto, Jest + mongodb-memory-server (backend); React 19 + Vite 6 + TypeScript strict + Tailwind v4 + React Router v6 + Vitest (frontend).

**Spec:** `docs/superpowers/specs/2026-09-16-auth-ux-supervisor-gates-design.md`

## Global Constraints

- Branch: `feature/auth-ux-supervisor-gates`. Never commit to `main`.
- Backend files live in `backend/`; run backend gates from repo root? **No** — backend package.json is at `backend/`, so run `npm run typecheck`, `npm run build`, `npm test` with `workdir: backend`. Frontend gates run with `workdir: frontend`: `npm run typecheck`, `npm run build`, `npm run lint`, `npm test`.
- Backend model convention: `new Schema<any>(...)`. No comments in source. No emoji in UI.
- Response envelope: `{ success: true, data }`; errors `{ message }` (+ optional `fields`). Roles unchanged: `student`/`supervisor`/`admin`.
- `AppError` constructor signature stays `(message, statusCode)`; optional third arg `fields` is additive.
- `apiFetch` must keep its current signature `apiFetch<T>(path, options)`.
- Do not invent routes, params, or response fields beyond this plan and the existing API (`backend.md`). No file upload endpoints.

---

## BACKEND TASKS

### Task 1: F1 — Structured auth errors (`AppError.fields` + messages)

**Files:**
- Modify: `backend/src/middleware/errorHandler.ts` (AppError class + errorHandler)
- Modify: `backend/src/controllers/authController.ts`
- Create: `backend/src/__tests__/authErrors.test.ts`

**Interfaces:**
- Produces: `AppError(message, statusCode, fields?)`; error responses now include `fields` when present.

- [ ] **Step 1: Write failing tests** (`backend/src/__tests__/authErrors.test.ts`)

```ts
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import bcrypt from 'bcryptjs';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

afterEach(async () => {
  await Promise.all([User.deleteMany({}), StudentProfile.deleteMany({})]);
});

describe('F1 auth error messages', () => {
  it('login: unknown email explains the email is unknown', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@college.edu', password: 'whatever1' });
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('No account found with this email');
    expect(res.body.fields).toEqual({ email: expect.any(String) });
  });

  it('login: wrong password is distinguishable and points at password', async () => {
    await User.create({
      email: 'a@college.edu',
      password: await bcrypt.hash('correct-password-1', 12),
      name: 'A',
      role: 'student',
      isActive: true,
    });
    const res = await request(app).post('/api/auth/login').send({ email: 'a@college.edu', password: 'wrong-password-1' });
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Incorrect password');
    expect(res.body.fields).toEqual({ password: expect.any(String) });
  });

  it('register: duplicate email returns 409 with fields.email', async () => {
    await User.create({
      email: 'dup@college.edu',
      password: await bcrypt.hash('secret123', 12),
      name: 'Dup',
      role: 'student',
      isActive: true,
    });
    const res = await request(app).post('/api/auth/register').send({
      email: 'DUP@college.edu',
      password: 'secret123',
      name: 'Dup',
      collegeId: 'CSE9999',
      rollNumber: '22CS9999',
      studentType: 'frp',
      department: 'CSE',
    });
    expect(res.status).toBe(409);
    expect(res.body.fields).toEqual({ email: expect.any(String) });
  });

  it('register: missing required fields have field targets', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@college.edu' });
    expect(res.status).toBe(400);
    expect(res.body.fields).toHaveProperty('password');
    expect(res.body.fields).toHaveProperty('name');
  });

  it('verify-otp: bad OTP points at otp field', async () => {
    const res = await request(app).post('/api/auth/verify-otp').send({ email: 'b@college.edu', otp: '000000' });
    expect(res.status).toBe(404); // unknown email surfaced distinctly from bad OTP
  });

  it('errorHandler passes fields through on unknown-field AppErrors', async () => {
    // login with neither field
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.fields).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the tests, confirm they FAIL**

Run (workdir `backend`): `npx jest src/__tests__/authErrors.test.ts`
Expected: FAIL — `fields` is undefined on error responses.

- [ ] **Step 3: Extend `AppError` and `errorHandler`** in `backend/src/middleware/errorHandler.ts`:

```ts
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public fields?: Record<string, string>;

  constructor(message: string, statusCode: number, fields?: Record<string, string>) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.fields = fields;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

In `errorHandler`, add `...(err instanceof AppError && err.fields ? { fields: err.fields } : {})` to the AppError JSON response.

- [ ] **Step 4: Rewrite auth error paths** in `backend/src/controllers/authController.ts`:

`registerStudent` validation block (placeholder for the full rework — see below):

```ts
const missing: Record<string, string> = {};
for (const f of ['email', 'password', 'name', 'collegeId', 'rollNumber', 'studentType', 'department'] as const) {
  if (!req.body[f]) missing[f] = 'This field is required.';
}
if (Object.keys(missing).length > 0) throw new AppError('Please complete all required fields.', 400, missing);

if (!EMAIL_REGEX.test(email)) throw new AppError('Enter a valid email address.', 400, { email: 'Enter a valid email address.' });
if (password.length < 6) throw new AppError('Password must be at least 6 characters.', 400, { password: 'Password must be at least 6 characters.' });

const existingUser = await User.findOne({ email: email.toLowerCase() });
if (existingUser) throw new AppError('An account with this email already exists. Try logging in.', 409, { email: 'This email is already registered.' });
```

`login`:

```ts
if (!email || !password) throw new AppError('Email and password are required.', 400, {
  ...(email ? {} : { email: 'Email is required.' }),
  ...(password ? {} : { password: 'Password is required.' }),
});

const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
if (!user) throw new AppError('No account found with this email.', 401, { email: 'No account is registered with this email.' });

const isMatch = await bcrypt.compare(password, user.password);
if (!isMatch) throw new AppError('Incorrect password. Please try again.', 401, { password: 'The password you entered is incorrect.' });

if (!user.isActive) throw new AppError('Account not verified. Please verify your email first.', 403, { email: 'Verify your email before logging in.' });
```

`verifyOTP`:

```ts
if (!email || !otp) throw new AppError('Email and OTP are required.', 400, {
  ...(email ? {} : { email: 'Email is required.' }),
  ...(otp ? {} : { otp: 'OTP is required.' }),
});
const user = await User.findOne({ email: email.toLowerCase() });
if (!user) throw new AppError('No account found with this email. Register first.', 404, { email: 'This email is not registered.' });
if (user.isActive) throw new AppError('Account is already verified. You can log in.', 400);
const isValid = await verifyOTPRecord(email.toLowerCase(), otp);
if (!isValid) throw new AppError('Invalid or expired OTP. Check and try again.', 400, { otp: 'The OTP is invalid or has expired.' });
```

- [ ] **Step 5: Run the tests, confirm they PASS**

Run (workdir `backend`): `npx jest src/__tests__/authErrors.test.ts`
Expected: all PASS.

- [ ] **Step 6: Verify existing suites still pass**

Run (workdir `backend`): `npm run typecheck` then `npm test`
Expected: typecheck clean, all 3 existing suites + new suite PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/middleware/errorHandler.ts backend/src/controllers/authController.ts backend/src/__tests__/authErrors.test.ts
git commit -m "feat(auth): structured field-level auth error messages (F1)"
```

---

### Task 2: F8 — Access + refresh token sessions (backend)

**Files:**
- Modify: `backend/src/config/env.ts`
- Create: `backend/src/models/RefreshToken.ts`
- Modify: `backend/src/middleware/auth.ts`
- Modify: `backend/src/controllers/authController.ts`
- Create: `backend/src/utils/tokens.ts`
- Modify: `backend/src/routes/authRoutes.ts`
- Create: `backend/src/__tests__/refreshTokens.test.ts`

**Interfaces:**
- Consumes: `AppError(message, statusCode, fields?)` from Task 1.
- Produces: `tokens.createRefreshSession(userId)` → `{ token: string, expiresAt: Date }`; `tokens.hashToken(raw)` → sha256 hex; `generateAccessToken(payload)`; `POST /api/auth/refresh` (body `{ refreshToken }` → `{ accessToken, refreshToken, user: { id, role, email } }`); `POST /api/auth/logout` (body `{ refreshToken }` → `{ message }`); login/register now return `{ accessToken, refreshToken, user }`.

- [ ] **Step 1: Add env vars** in `backend/src/config/env.ts`:

```ts
JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET || 'fallback_secret_change_me'),
```

- [ ] **Step 2: Create `backend/src/models/RefreshToken.ts`**

```ts
import mongoose, { Schema, Document } from 'mongoose';
import { IRefreshToken } from '../types';

export interface IRefreshTokenDocument extends IRefreshToken, Document {}

const refreshTokenSchema = new Schema<any>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ tokenHash: 1 }, { unique: true });
refreshTokenSchema.index({ user: 1, expiresAt: 1 });

export const RefreshToken = mongoose.model<IRefreshTokenDocument>('RefreshToken', refreshTokenSchema);
```

Add to `backend/src/types/index.ts`:

```ts
export interface IRefreshToken {
  user: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 3: Write failing tests** (`backend/src/__tests__/refreshTokens.test.ts`)

```ts
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import { User } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

afterEach(async () => {
  await User.deleteMany({});
  await RefreshToken.deleteMany({});
});

async function makeUser(overrides: Record<string, unknown> = {}) {
  return User.create({
    email: 'rt@college.edu',
    password: 'secret123',
    name: 'RT',
    role: 'student',
    isActive: true,
    ...overrides,
  });
}

const login = async () => {
  const res = await request(app).post('/api/auth/login').send({ email: 'rt@college.edu', password: 'secret123' });
  return res.body.data as { accessToken: string; refreshToken: string; user: { id: string; role: string; email: string } };
};

describe('F8 refresh tokens', () => {
  it('login returns accessToken + refreshToken', async () => {
    await makeUser();
    const data = await login();
    expect(data.accessToken).toBeTruthy();
    expect(data.refreshToken).toBeTruthy();
    expect(data.user.role).toBe('student');
  });

  it('refresh rotates: old refresh token is invalid after use', async () => {
    await makeUser();
    const { accessToken } = await login();
    // access token works on /me
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${accessToken}`);
    expect(me.status).toBe(200);

    const first = await login();
    const refreshed = await request(app).post('/api/auth/refresh').send({ refreshToken: first.refreshToken });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeTruthy();

    const replay = await request(app).post('/api/auth/refresh').send({ refreshToken: first.refreshToken });
    expect(replay.status).toBe(401);
  });

  it('logout invalidates the refresh token', async () => {
    await makeUser();
    const { refreshToken } = await login();
    const out = await request(app).post('/api/auth/logout').send({ refreshToken });
    expect(out.status).toBe(200);
    const nue = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(nue.status).toBe(401);
  });

  it('a refresh token is not accepted as an access token', async () => {
    await makeUser();
    const { refreshToken } = await login();
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${refreshToken}`);
    expect(me.status).toBe(401);
  });
});
```

- [ ] **Step 4: Run tests, confirm they FAIL**

Run (workdir `backend`): `npx jest src/__tests__/refreshTokens.test.ts`
Expected: FAIL — login response still returns `token`, not `accessToken`/`refreshToken`.

- [ ] **Step 5: Create `backend/src/utils/tokens.ts`**

```ts
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { RefreshToken } from '../models/RefreshToken';
import { User } from '../models/User';
import { UserRole } from '../types';

export const hashToken = (raw: string): string =>
  crypto.createHash('sha256').update(raw).digest('hex');

export const generateAccessToken = (payload: {
  id: string;
  role: UserRole;
  email: string;
}): string => {
  return jwt.sign({ ...payload, type: 'access' }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
};

const msFromEnv = (value: string): number => {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(match[1]);
  const ms = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]];
  return n * ms;
};

export const createRefreshSession = async (userId: string): Promise<{ token: string; expiresAt: Date }> => {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + msFromEnv(env.JWT_REFRESH_EXPIRES_IN));
  await RefreshToken.create({ user: userId, tokenHash: hashToken(token), expiresAt });
  return { token, expiresAt };
};

export const revokeRefreshToken = async (raw: string): Promise<boolean> => {
  const result = await RefreshToken.deleteOne({ tokenHash: hashToken(raw) });
  return (result.deletedCount ?? 0) > 0;
};

export type RefreshUseCaseResult =
  | { ok: true; accessToken: string; refreshToken: string; user: { id: string; role: UserRole; email: string } }
  | { ok: false; reason: 'invalid' | 'expired' };

export const refreshUseCase = async (raw: string): Promise<RefreshUseCaseResult> => {
  const doc = await RefreshToken.findOne({ tokenHash: hashToken(raw) });
  if (!doc) return { ok: false, reason: 'invalid' };
  if (doc.expiresAt.getTime() < Date.now()) {
    await doc.deleteOne();
    return { ok: false, reason: 'expired' };
  }
  const user = await User.findById(doc.user);
  if (!user) {
    await doc.deleteOne();
    return { ok: false, reason: 'invalid' };
  }
  await doc.deleteOne();
  const { token: newRefresh } = await createRefreshSession(String(user._id));
  const accessToken = generateAccessToken({ id: String(user._id), role: user.role, email: user.email });
  return {
    ok: true,
    accessToken,
    refreshToken: newRefresh,
    user: { id: String(user._id), role: user.role, email: user.email },
  };
};
```

- [ ] **Step 6: Update `backend/src/middleware/auth.ts`**

Replace `generateToken` with:

```ts
import { generateAccessToken } from '../utils/tokens';
export { authenticate, authorize };
```

And in this same file, keep `authenticate` but add a `type` check after decode:

```ts
const decoded = jwt.verify(token, env.JWT_SECRET) as {
  id: string;
  role: UserRole;
  email: string;
  type?: string;
};
if (decoded.type && decoded.type !== 'access') {
  res.status(401).json({ message: 'Invalid or expired token' });
  return;
}
req.user = decoded;
next();
```

Remove the old `generateToken` export; update `authController.ts` imports accordingly.

- [ ] **Step 7: Update `authController.ts` for token pairs**

- Remove `import { generateToken } from '../middleware/auth'`; import `generateAccessToken`, `createRefreshSession`, `refreshUseCase`, `revokeRefreshToken` from `../utils/tokens`.
- `registerStudent` and `login`: replace `token = generateToken(...)` with

```ts
const accessToken = generateAccessToken({ id: user._id.toString(), role: user.role, email: user.email });
const { token: refreshToken } = await createRefreshSession(user._id.toString());
```

and return `data: { accessToken, refreshToken, user: {...} }`.
- Add handlers:

```ts
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken: raw } = req.body;
  if (!raw) throw new AppError('refreshToken is required', 400, { refreshToken: 'Refresh token is required.' });
  const result = await refreshUseCase(raw);
  if (!result.ok) {
    const message = result.reason === 'expired'
      ? 'Session expired. Please log in again.'
      : 'Invalid session. Please log in again.';
    throw new AppError(message, 401, { refreshToken: message });
  }
  res.status(200).json({ success: true, data: result });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken: raw } = req.body;
  if (raw) await revokeRefreshToken(raw);
  res.status(200).json({ success: true, data: { message: 'Logged out successfully.' } });
});
```

- **Also fold in Task 4's "profilePhoto on user"** now (Task 2 depends on the user object builder):

```ts
const buildUserPayload = async (user: { _id: unknown; name: string; email: string; role: UserRole }) => {
  const profile = user.role === UserRole.STUDENT
    ? await StudentProfile.findOne({ user: user._id })
    : await FacultyProfile.findOne({ user: user._id });
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    profilePhoto: profile?.profilePhoto ?? null,
    ...(user.role === UserRole.STUDENT && { isProfileComplete: profile?.isProfileComplete }),
  };
};
```

Use `const payload = await buildUserPayload(user);` everywhere a user object is returned (register, login, me).

- `getMe` already loads `profile`; restructure it to:

```ts
export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  const profile = user.role === UserRole.STUDENT
    ? await StudentProfile.findOne({ user: user._id })
      .populate('supervisor', 'employeeId department designation')
      .populate('coSupervisor', 'employeeId department designation')
      .populate('srcCommittee')
    : await FacultyProfile.findOne({ user: user._id });
  res.status(200).json({
    success: true,
    data: {
      ...(await buildUserPayload(user)),
      isActive: user.isActive,
      profile,
    },
  });
});
```

- [ ] **Step 8: Register routes** in `backend/src/routes/authRoutes.ts`:

```ts
router.post('/refresh', refreshToken);
router.post('/logout', logout);
```

- [ ] **Step 9: Run tests, confirm they PASS**

Run (workdir `backend`): `npx jest src/__tests__/refreshTokens.test.ts`
Expected: all PASS.

- [ ] **Step 10: Fix any other `generateToken` callers**

`rg "generateToken" backend/src` confirms it is only referenced by `authController.ts` (import + two call sites) and its definition in `middleware/auth.ts` — both already handled in this task. If the grep happens to find other callers, migrate them to `generateAccessToken`/`createRefreshSession` or leave access-only where the flow truly only needs a short-lived token.

- [ ] **Step 11: Full backend verification**

Run (workdir `backend`): `npm run typecheck`, `npm run build`, `npm test`
Expected: all clean, all suites pass.

- [ ] **Step 12: Commit**

```bash
git add backend/src/config/env.ts backend/src/models/RefreshToken.ts backend/src/middleware/auth.ts backend/src/utils/tokens.ts backend/src/controllers/authController.ts backend/src/routes/authRoutes.ts backend/src/types/index.ts backend/src/__tests__/refreshTokens.test.ts backend/.env.example
git commit -m "feat(auth): refresh and access token sessions with rotation (F8)"
```

---

### Task 3: F3 — Sequential semester creation

**Files:**
- Modify: `backend/src/controllers/studentController.ts`
- Create: `backend/src/__tests__/semesterSequence.test.ts`

**Interfaces:**
- Consumes: `AppError(message, statusCode, fields?)`.
- Produces: `createSemester` rejects any `semesterNumber !== expected`.

- [ ] **Step 1: Write failing test** (`backend/src/__tests__/semesterSequence.test.ts`)

```ts
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { Semester } from '../models/Semester';
import bcrypt from 'bcryptjs';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

let userId: string;
let profileId: string;
let token: string;

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), StudentProfile.deleteMany({}), Semester.deleteMany({})]);
  const user = await User.create({
    email: 'sem@college.edu', password: await bcrypt.hash('secret123', 12),
    name: 'Sem', role: 'student', isActive: true,
  });
  userId = String(user._id);
  const profile = await StudentProfile.create({
    user: user._id, collegeId: 'CSE8001', rollNumber: '22CS8001',
    studentType: 'frp', department: 'CSE', admissionDate: new Date(),
    requiredCredits: 12, isProfileComplete: true,
  });
  profileId = String(profile._id);
  const login = await request(app).post('/api/auth/login').send({ email: 'sem@college.edu', password: 'secret123' });
  token = login.body.data.accessToken;
});

describe('F3 semester sequencing', () => {
  const createSemester = (semesterNumber: number) =>
    request(app).post('/api/student/semesters')
      .set('Authorization', `Bearer ${token}`)
      .send({ semesterNumber, academicYear: '2026-27' });

  it('first semester must be semester 1', async () => {
    const res = await createSemester(3);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Semester 3 cannot be added');
  });

  it('accepts 1 then 2, rejects 3 before 2 exists', async () => {
    const first = await createSemester(1);
    expect(first.status).toBe(201);
    const jump = await createSemester(3);
    expect(jump.status).toBe(400);
    const second = await createSemester(2);
    expect(second.status).toBe(201);
    const third = await createSemester(3);
    expect(third.status).toBe(201);
  });

  it('duplicate semester still conflicts', async () => {
    await createSemester(1);
    const dup = await createSemester(1);
    expect(dup.status).toBe(409);
  });
});
```

- [ ] **Step 2: Run, confirm FAIL**

Run (workdir `backend`): `npx jest src/__tests__/semesterSequence.test.ts`
Expected: FAIL — out-of-order numbers are accepted.

- [ ] **Step 3: Implement the check** in `createSemester` (`backend/src/controllers/studentController.ts`), right after the existing duplicate check:

```ts
const lastSemester = await Semester.findOne({ student: profile._id }).sort({ semesterNumber: -1 });
const expected = lastSemester ? lastSemester.semesterNumber + 1 : 1;
if (semesterNumber !== expected) {
  throw new AppError(`Semester ${semesterNumber} cannot be added. Next semester is ${expected}.`, 400, {
    semesterNumber: `The next semester to add is ${expected}.`,
  });
}
```

- [ ] **Step 4: Run, confirm PASS**

Run (workdir `backend`): `npx jest src/__tests__/semesterSequence.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify** `npm run typecheck` (workdir `backend`) then commit.

```bash
git add backend/src/controllers/studentController.ts backend/src/__tests__/semesterSequence.test.ts
git commit -m "feat(student): sequential semester creation (F3)"
```

---

### Task 4: F4 — Supervisor required for academic actions

**Files:**
- Modify: `backend/src/controllers/studentController.ts`
- Create: `backend/src/__tests__/supervisorGate.test.ts`

**Interfaces:**
- Consumes: `AppError`.
- Produces: `submitThesis`, `addCourse`, `uploadDocument` throw `403` when `profile.supervisor` is unset.

- [ ] **Step 1: Write failing test** (`backend/src/__tests__/supervisorGate.test.ts`)

```ts
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { Semester } from '../models/Semester';
import { FacultyProfile } from '../models/FacultyProfile';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

async function setup(withSupervisor: boolean) {
  await Promise.all([User.deleteMany({}), StudentProfile.deleteMany({}), Semester.deleteMany({}), FacultyProfile.deleteMany({})]);
  const user = await User.create({
    email: 'gate@college.edu', password: await bcrypt.hash('secret123', 12),
    name: 'Gate', role: 'student', isActive: true,
  });
  const prof = withSupervisor ? await FacultyProfile.create({
    user: new mongoose.Types.ObjectId(), employeeId: 'FAC-GATE', department: 'CSE', designation: 'Professor',
  }) : null;
  await StudentProfile.create({
    user: user._id, collegeId: 'CSE7001', rollNumber: '22CS7001',
    studentType: 'frp', department: 'CSE', admissionDate: new Date(),
    requiredCredits: 12, isProfileComplete: true,
    supervisor: prof?._id ?? undefined,
  });
  const sem = await Semester.create({ student: (await StudentProfile.findOne({ user: user._id }))!._id, semesterNumber: 1, academicYear: '2026-27' });
  const login = await request(app).post('/api/auth/login').send({ email: 'gate@college.edu', password: 'secret123' });
  return { token: login.body.data.accessToken, semId: String(sem._id) };
}

describe('F4 supervisor gate', () => {
  it('blocks course request without a supervisor', async () => {
    const { token, semId } = await setup(false);
    const res = await request(app).post(`/api/student/semesters/${semId}/courses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ courseCode: 'CS701', courseName: 'Advanced Algorithms', credits: 4 });
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('supervisor');
  });

  it('blocks thesis submission without a supervisor', async () => {
    const { token } = await setup(false);
    const res = await request(app).post('/api/student/thesis')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'T', documentUrl: 'https://x/y.pdf' });
    expect(res.status).toBe(403);
  });

  it('allows course request with a supervisor', async () => {
    const { token, semId } = await setup(true);
    const res = await request(app).post(`/api/student/semesters/${semId}/courses`)
      .set('Authorization', `Bearer ${token}`)
      .send({ courseCode: 'CS701', courseName: 'Advanced Algorithms', credits: 4 });
    expect(res.status).toBe(201);
  });
});
```

- [ ] **Step 2: Run, confirm FAIL**

Run (workdir `backend`): `npx jest src/__tests__/supervisorGate.test.ts`
Expected: FAIL — no 403 currently returned.

- [ ] **Step 3: Add the guard** in `backend/src/controllers/studentController.ts`:

```ts
const requireAssignedSupervisor = (profile: { supervisor?: string }, action: string): void => {
  if (!profile.supervisor) {
    throw new AppError(`${action} requires an assigned supervisor.`, 403);
  }
};
```

Call it after fetching `profile` in `addCourse` (action `'Requesting a course'`), `submitThesis` (action `'Submitting a thesis'`), and `uploadDocument` (action `'Uploading a document'`).

- [ ] **Step 4: Run, confirm PASS**

Run (workdir `backend`): `npx jest src/__tests__/supervisorGate.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify** `npm run typecheck`, `npm test` (workdir `backend`), then commit.

```bash
git add backend/src/controllers/studentController.ts backend/src/__tests__/supervisorGate.test.ts
git commit -m "feat(student): require assigned supervisor for academic actions (F4)"
```

---

### Task 5: F7 — Student profile fields for onboarding

**Files:**
- Modify: `backend/src/models/StudentProfile.ts`
- Modify: `backend/src/types/index.ts` (`IStudentProfile`)
- Modify: `backend/src/controllers/studentController.ts` (`updateProfile`)
- Create: `backend/src/__tests__/profileFields.test.ts`

**Interfaces:**
- Produces: profile fields `dateOfBirth, gender, bloodGroup, category, phone, address, lastDegree, institution, graduationYear, qualification`; `updateProfile` accepts them and recomputes `isProfileComplete`.

- [ ] **Step 1: Write failing test** (`backend/src/__tests__/profileFields.test.ts`)

```ts
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

let token: string;
let profileId: string;

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), StudentProfile.deleteMany({})]);
  const user = await User.create({
    email: 'pf@college.edu', password: await bcrypt.hash('secret123', 12),
    name: 'PF', role: 'student', isActive: true,
  });
  const profile = await StudentProfile.create({
    user: user._id, collegeId: 'CSE6001', rollNumber: '22CS6001',
    studentType: 'frp', department: 'CSE', admissionDate: new Date(),
    requiredCredits: 12, isProfileComplete: false,
  });
  profileId = String(profile._id);
  const login = await request(app).post('/api/auth/login').send({ email: 'pf@college.edu', password: 'secret123' });
  token = login.body.data.accessToken;
});

describe('F7 profile fields', () => {
  it('PUT /student/profile persists the new fields and marks incomplete profile still incomplete', async () => {
    const res = await request(app).put('/api/student/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ researchArea: 'ML', bloodGroup: 'B+', phone: '9999999999' });
    expect(res.status).toBe(200);
    const stored = await StudentProfile.findById(profileId);
    expect(stored!.bloodGroup).toBe('B+');
    expect(stored!.phone).toBe('9999999999');
    expect(stored!.isProfileComplete).toBe(false);
  });

  it('completes the profile when all required fields are present', async () => {
    const res = await request(app).put('/api/student/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        researchArea: 'ML', phone: '9999999999', address: 'Jamshedpur',
        lastDegree: 'M.Tech', institution: 'NIT JSR', graduationYear: 2022,
        dateOfBirth: '2000-01-01',
      });
    expect(res.status).toBe(200);
    const stored = await StudentProfile.findById(profileId);
    expect(stored!.isProfileComplete).toBe(true);
  });
});
```

- [ ] **Step 2: Run, confirm FAIL**

Run (workdir `backend`): `npx jest src/__tests__/profileFields.test.ts`
Expected: FAIL — schema has no `bloodGroup`/`phone`.

- [ ] **Step 3: Extend the schema** in `backend/src/models/StudentProfile.ts` (and `IStudentProfile` in `backend/src/types/index.ts`):

```ts
dateOfBirth: { type: Date },
gender: { type: String, trim: true },
bloodGroup: { type: String, trim: true },
category: { type: String, trim: true },
phone: { type: String, trim: true },
address: { type: String, trim: true },
lastDegree: { type: String, trim: true },
institution: { type: String, trim: true },
graduationYear: { type: Number },
qualification: { type: String, trim: true },
```

Add the same fields to `IStudentProfile` (optional where sensible).

- [ ] **Step 4: Update `updateProfile`** in `backend/src/controllers/studentController.ts`:

```ts
const editable = ['researchArea', 'profilePhoto', 'dateOfBirth', 'gender', 'bloodGroup', 'category', 'phone', 'address', 'lastDegree', 'institution', 'graduationYear', 'qualification'] as const;
for (const field of editable) {
  if (req.body[field] !== undefined) {
    (profile as unknown as Record<string, unknown>)[field] = req.body[field];
  }
}

const REQUIRED_PROFILE_FIELDS = ['researchArea', 'phone', 'address', 'lastDegree', 'institution', 'graduationYear', 'dateOfBirth'] as const;
profile.isProfileComplete = REQUIRED_PROFILE_FIELDS.every((f) => {
  const v = (profile as unknown as Record<string, unknown>)[f];
  return v !== undefined && v !== null && v !== '';
});
```

`dateOfBirth` arrives as a date string; coerce: `if (req.body.dateOfBirth) profile.dateOfBirth = new Date(req.body.dateOfBirth);`.

- [ ] **Step 5: Run, confirm PASS**

Run (workdir `backend`): `npx jest src/__tests__/profileFields.test.ts`
Expected: PASS.

- [ ] **Step 6: Verify + commit**

Run (workdir `backend`): `npm run typecheck`, `npm test`.

```bash
git add backend/src/models/StudentProfile.ts backend/src/types/index.ts backend/src/controllers/studentController.ts backend/src/__tests__/profileFields.test.ts
git commit -m "feat(student): onboarding profile fields and isProfileComplete (F7 backend)"
```

---

## FRONTEND TASKS

### Task 6: F8 — Refresh-aware fetch client + AuthContext

**Files:**
- Modify: `frontend/src/api/client.ts`
- Modify: `frontend/src/api/client.test.ts`
- Modify: `frontend/src/api/auth.ts`
- Modify: `frontend/src/context/AuthContext.tsx`
- Modify: `frontend/src/types/index.ts` (`AuthUser`)

**Interfaces:**
- Consumes: backend `{ accessToken, refreshToken, user }`, `POST /auth/refresh`, `POST /auth/logout` (Tasks 2).
- Produces: `REFRESH_KEY`, `getStoredRefreshToken/setStoredRefreshToken/clearStoredTokens`, single-flight refresh in `apiFetch`; `AuthUser.profilePhoto?: string | null`, `AuthUser.isProfileComplete?: boolean`.

- [ ] **Step 1: Write failing test** — extend `frontend/src/api/client.test.ts`:

```ts
it('refreshes once on 401 then retries, using stored refresh token', async () => {
  setStoredToken('expired.access');
  localStorage.setItem(REFRESH_KEY, 'valid.refresh');
  const calls = vi
    .fn()
    .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ message: 'Invalid or expired token' }) })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true, data: { accessToken: 'new.access', refreshToken: 'new.refresh' } }) })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true, data: { ok: 1 } }) });
  globalThis.fetch = calls as unknown as typeof fetch;
  await apiFetch<{ ok: number }>('/me');
  expect(localStorage.getItem(TOKEN_KEY)).toBe('new.access');
  expect(localStorage.getItem(REFRESH_KEY)).toBe('new.refresh');
  const authHeaders = calls.mock.calls.map((c) => (c[1] as RequestInit).headers);
  expect(authHeaders[authHeaders.length - 1]).toEqual(expect.objectContaining({ Authorization: 'Bearer new.access' }));
});

it('clears tokens and dispatches auth:unauthorized when refresh fails', async () => {
  setStoredToken('expired.access');
  localStorage.setItem(REFRESH_KEY, 'dead.refresh');
  const calls = vi.fn()
    .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ message: 'Invalid or expired token' }) })
    .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ message: 'Session expired' }) });
  globalThis.fetch = calls as unknown as typeof fetch;
  const dispatched: unknown[] = [];
  const handler = (e: Event) => dispatched.push(e);
  window.addEventListener('auth:unauthorized', handler);
  await expect(apiFetch('/me')).rejects.toThrow(ApiError);
  expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  expect(localStorage.getItem(REFRESH_KEY)).toBeNull();
  expect(dispatched).toHaveLength(1);
  window.removeEventListener('auth:unauthorized', handler);
});
```

The existing 401 test (lines 49-59) keeps passing unchanged: `afterEach` runs `clearStoredToken()` (which now also clears the refresh token), so on `/me` 401 there is no stored refresh token and the client falls straight through to clearing + dispatching `auth:unauthorized`. Add `REFRESH_KEY` to the test file's import list for the new tests.

- [ ] **Step 2: Run, confirm FAIL**

Run (workdir `frontend`): `npx vitest run src/api/client.test.ts`
Expected: FAIL — no refresh behavior yet.

- [ ] **Step 3: Rewrite `frontend/src/api/client.ts`**

```ts
export const TOKEN_KEY = 'cse_portal_token';
export const REFRESH_KEY = 'cse_portal_refresh';

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}
export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
export function setStoredTokens(access: string, refresh: string): void {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refresh = getStoredRefreshToken();
    if (!refresh) return null;
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { success: boolean; data: { accessToken: string; refreshToken: string } };
      setStoredTokens(json.data.accessToken, json.data.refreshToken);
      return json.data.accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}
```

- File ordering note: define `const API_URL = import.meta.env.VITE_API_URL ?? '/api';` before `refreshAccessToken` (anywhere above `doFetch`).

In `apiFetch`, extract the request into a private `doFetch(path, options, canRefresh)` and bound refresh to a single retry (no recursion loops):

```ts
async function doFetch<T>(path: string, options: FetchOptions, canRefresh: boolean): Promise<T> {
  const { method = 'GET', body, query } = options;

  const url = new URL(`${API_URL}${path}`, window.location.origin);
  if (query) {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    }
    url.search = parts.join('&');
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
    const fields =
      json && typeof json === 'object' && 'fields' in json
        ? (json as { fields?: Record<string, string> }).fields
        : undefined;

    if (res.status === 401 && canRefresh && !path.startsWith('/auth/')) {
      const fresh = await refreshAccessToken();
      if (fresh) return doFetch(path, options, false); // exactly one retry
    }
    if (res.status === 401) {
      clearStoredToken();
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    throw new ApiError(message, res.status, fields);
  }

  const envelope = json as ApiEnvelope<T> | null;
  return envelope?.data as T;
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  return doFetch(path, options, true);
}
```

Carry `fields` from error JSON into `ApiError` (constructor gains a third optional arg: `constructor(message, status, fields?)`).

- [ ] **Step 4: Update `frontend/src/api/auth.ts`**

```ts
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

login: () => apiFetch<AuthTokens & { user: AuthUser }>('/auth/login', { method: 'POST', body: { email, password } }),
register: () => apiFetch<AuthTokens & { user: AuthUser; message: string }>('/auth/register', { method: 'POST', body: payload }),
logout: (refreshToken: string) => apiFetch<{ message: string }>('/auth/logout', { method: 'POST', body: { refreshToken } }),
```

- [ ] **Step 5: Update `frontend/src/context/AuthContext.tsx`**

- `AuthUser` type gains `profilePhoto?: string | null; isProfileComplete?: boolean;`.
- `login`:

```ts
const res = await authApi.login(email, password);
setStoredTokens(res.accessToken, res.refreshToken);
setUser(res.user);
return res.user;
```

with `import { ..., setStoredTokens } from '../api/client'`.
- `logout`:

```ts
const refresh = getStoredRefreshToken();
if (refresh) authApi.logout(refresh).catch(() => undefined);
clearStoredToken();
setUser(null);
```

- `reload`: unchanged (uses token via client); the `/auth/me` call now must not hit the refresh path in a loop — `apiFetch` retries it automatically when 401.

- [ ] **Step 6: Run tests, confirm PASS**

Run (workdir `frontend`): `npx vitest run src/api/client.test.ts`
Expected: PASS.

- [ ] **Step 7: Verify + commit**

Run (workdir `frontend`): `npm run typecheck`, `npm run build`, `npm run lint`.

```bash
git add frontend/src/api/client.ts frontend/src/api/client.test.ts frontend/src/api/auth.ts frontend/src/context/AuthContext.tsx frontend/src/types/index.ts
git commit -m "feat(auth): refresh-aware api client and token storage (F8 frontend)"
```

---

### Task 7: F1/F2 — PasswordInput + frontend auth error surfacing

**Files:**
- Create: `frontend/src/components/ui/PasswordInput.tsx`
- Modify: `frontend/src/pages/auth/LoginPage.tsx`
- Modify: `frontend/src/pages/auth/RegisterPage.tsx`
- Modify: `frontend/src/pages/auth/VerifyOtpPage.tsx`
- Modify: `frontend/src/components/layout/Header.tsx` (change-password modal passwords)
- Create: `frontend/src/utils/errors.ts`
- Create: `frontend/src/utils/errors.test.ts`

**Interfaces:**
- Consumes: `ApiError.fields` (Task 6).
- Produces: `PasswordInput` (same props API as `Input`, plus `toggleLabel?`); `applyServerError(err, setFieldErrors, setServerError)` helper.

- [ ] **Step 1: Write failing test** (`frontend/src/utils/errors.test.ts`)

```ts
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { errorFields, errorMessage, applyServerError } from './errors';

describe('error helpers', () => {
  it('extracts fields and message from ApiError', () => {
    const err = new ApiError('Bad request', 400, { email: 'Duplicate' });
    expect(errorMessage(err)).toBe('Bad request');
    expect(errorFields(err)).toEqual({ email: 'Duplicate' });
  });

  it('applyServerError merges fields into setFieldErrors and falls back to serverError', () => {
    const setFields = vi.fn();
    const setServer = vi.fn();
    applyServerError(new ApiError('Bad', 400, { email: 'Duplicate' }), setFields, setServer);
    expect(setFields).toHaveBeenCalledWith({ email: 'Duplicate' });
    expect(setServer).not.toHaveBeenCalled();

    applyServerError(new ApiError('Server down', 500), setFields, setServer);
    expect(setServer).toHaveBeenCalledWith('Server down');
  });
});
```

- [ ] **Step 2: Run, confirm FAIL** (workdir `frontend`): `npx vitest run src/utils/errors.test.ts`

- [ ] **Step 3: Create `frontend/src/utils/errors.ts`**

```ts
import { ApiError } from '../api/client';

export function errorFields(err: unknown): Record<string, string> | undefined {
  return err instanceof ApiError ? err.fields : undefined;
}

export function errorMessage(err: unknown): string | null {
  return err instanceof ApiError ? err.message : null;
}

export function applyServerError(
  err: unknown,
  setFieldErrors: (fields: Record<string, string>) => void,
  setServerError: (message: string | null) => void
): void {
  const fields = errorFields(err);
  if (fields && Object.keys(fields).length > 0) {
    setFieldErrors(fields);
    return;
  }
  const message = errorMessage(err);
  if (message) setServerError(message);
}
```

The `setFieldErrors` parameter accepts React's `Dispatch<SetStateAction<FieldErrors>>` directly — a plain `Record<string, string>` is assignable to `SetStateAction<{email?: string; ...}>` because all target properties are optional.

- [ ] **Step 4: Create `frontend/src/components/ui/PasswordInput.tsx`**

```tsx
import { useState } from 'react';
import type { InputHTMLAttributes, JSX } from 'react';
import { cn } from '../../utils/cn';

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  id?: string;
  label?: string;
  error?: string;
  hint?: string;
}

export function PasswordInput({ id, label, error, hint, className, ...rest }: PasswordInputProps): JSX.Element {
  const [visible, setVisible] = useState(false);
  const showId = id ? `${id}-toggle` : undefined;
  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn(
            'block w-full rounded-md border border-gray-300 bg-white py-2 pr-10 pl-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
            error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
            className
          )}
          {...rest}
        />
        <button
          id={showId}
          type="button"
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:text-gray-900"
        >
          {visible ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0 1 12 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 0 1 1.563-3.029m5.858.908a3 3 0 1 1 4.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532 3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0 1 12 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 0 1-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
            </svg>
          )}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-gray-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default PasswordInput;
```

- [ ] **Step 5: Use it + surface errors**

- `LoginPage.tsx`: replace the password `Input` with `PasswordInput`; change the submit `catch` to bind the error and surface server messages:

```tsx
} catch (err) {
  setSubmitting(false);
  applyServerError(err, setFieldErrors, setServerError);
}
```

`setFieldErrors` is `Dispatch<SetStateAction<FieldErrors>>` and typechecks against the helper's `(fields: Record<string, string>) => void` parameter.

- `RegisterPage.tsx`: same two changes (use `PasswordInput` for password; `catch (err)` + `applyServerError(err, setFieldErrors, setServerError)`).
- `VerifyOtpPage.tsx`: use `applyServerError` for OTP/email errors (`catch (err)`).
- `Header.tsx` change-password modal: swap the three password `Input`s for `PasswordInput` and surface server messages with `applyServerError(err, setFieldErrors, setPwError)`.

- [ ] **Step 6: Run tests** — `npx vitest run src/utils/errors.test.ts` (PASS), then `npm run typecheck`, `npm run build`, `npm run lint` (workdir `frontend`).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ui/PasswordInput.tsx frontend/src/utils/errors.ts frontend/src/utils/errors.test.ts frontend/src/pages/auth/LoginPage.tsx frontend/src/pages/auth/RegisterPage.tsx frontend/src/pages/auth/VerifyOtpPage.tsx frontend/src/components/layout/Header.tsx
git commit -m "feat(auth): password visibility toggle and field-level auth errors (F1 F2)"
```

---

### Task 8: F6 — Avatar component + photo everywhere

**Files:**
- Create: `frontend/src/components/ui/Avatar.tsx`
- Modify: `frontend/src/components/layout/Header.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx` (also covers F5 sidebar identity)
- Modify: `frontend/src/components/layout/MobileNav.tsx` (also covers F5)
- Modify: `frontend/src/pages/student/StudentProfile.tsx`
- Modify: `frontend/src/pages/supervisor/StudentDetail.tsx`
- Modify: `frontend/src/pages/admin/StudentManagement.tsx`
- Modify: `frontend/src/pages/admin/FacultyManagement.tsx`
- Create: `frontend/src/components/ui/Avatar.test.tsx`

**Interfaces:**
- Consumes: `AuthUser.profilePhoto` (Task 6), profile objects with `profilePhoto?`.
- Produces: `Avatar({ name, photo?, size?: 'sm'|'md'|'lg', className? })`.

- [ ] **Step 1: Write failing test** (`frontend/src/components/ui/Avatar.test.tsx`)

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar } from './Avatar';

describe('Avatar', () => {
  it('renders an image when photo is provided', () => {
    render(<Avatar name="Aarav Gupta" photo="https://x/photo.jpg" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://x/photo.jpg');
  });

  it('falls back to initials when no photo', () => {
    render(<Avatar name="Aarav Gupta" />);
    expect(screen.getByText('AG')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
```

- [ ] **Step 2: Run, confirm FAIL** — `npx vitest run src/components/ui/Avatar.test.tsx` (file missing).

- [ ] **Step 3: Create `frontend/src/components/ui/Avatar.tsx`**

```tsx
import type { JSX } from 'react';
import { cn } from '../../utils/cn';

const SIZES = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-9 w-9 text-sm',
  lg: 'h-16 w-16 text-lg',
} as const;

interface AvatarProps {
  name: string;
  photo?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

function initials(name: string): string {
  return name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
}

export function Avatar({ name, photo, size = 'md', className }: AvatarProps): JSX.Element {
  if (photo) {
    return (
      <img
        src={photo}
        alt="" 
        className={cn('shrink-0 rounded-full object-cover', SIZES[size], className)}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={cn('flex shrink-0 items-center justify-center rounded-full bg-blue-600 font-semibold text-white', SIZES[size], className)}
    >
      {initials(name) || '?'}
    </div>
  );
}

export default Avatar;
```

- [ ] **Step 4: Wire it in**

- `Header.tsx`: replace the initials div (`flex h-8 w-8 ...`) with `<Avatar name={user.name} photo={user.profilePhoto ?? null} size="sm" />`.
- `Sidebar.tsx` (F5 identity block): in the brand block, swap `CSE` box + `PhD Scholar Portal`/`NIT Jamshedpur` for:

```tsx
<div className="flex items-center gap-3">
  <Avatar name={user.name} photo={user.profilePhoto ?? null} />
  <div className="min-w-0">
    <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
    <p className="truncate text-xs text-gray-500">{ROLE_LABELS[user.role]}</p>
  </div>
</div>
```

Remove the duplicate role line below.

- `MobileNav.tsx`: same identity swap in the mobile panel header.
- `StudentProfile.tsx`: show the photo at the top (add a `Card` or header row): `<Avatar name={data.user.name} photo={data.profilePhoto ?? null} size="lg" />` next to the name; keep the URL edit field.
- `StudentDetail.tsx` (supervisor): show `profile.profilePhoto` via Avatar next to the student name.
- `StudentManagement.tsx` / `FacultyManagement.tsx`: add an Avatar cell (sm) in the list tables when `profilePhoto` exists.

- [ ] **Step 5: Verify + commit**

`npx vitest run src/components/ui/Avatar.test.tsx`, then `npm run typecheck`, `npm run build`, `npm run lint` (workdir `frontend`).

```bash
git add frontend/src/components/ui/Avatar.tsx frontend/src/components/ui/Avatar.test.tsx frontend/src/components/layout/Header.tsx frontend/src/components/layout/Sidebar.tsx frontend/src/components/layout/MobileNav.tsx frontend/src/pages/student/StudentProfile.tsx frontend/src/pages/supervisor/StudentDetail.tsx frontend/src/pages/admin/StudentManagement.tsx frontend/src/pages/admin/FacultyManagement.tsx
git commit -m "feat(ui): avatar component and profile photo display (F5 F6)"
```

---

### Task 9: F5 — Responsive logout / header dropdown

**Files:**
- Modify: `frontend/src/components/layout/Header.tsx`

**Interfaces:**
- Produces: viewport-safe user dropdown.

- [ ] **Step 1: Constrain the dropdown to the viewport**

In `Header.tsx`, change the dropdown container class (currently `absolute right-0 top-full mt-2 w-56 ...`) to:

```
absolute right-0 top-full mt-2 max-w-[calc(100vw-2rem)] w-56 rounded-lg border border-gray-200 bg-white p-1 shadow-lg outline-none
```

- [ ] **Step 2: Make the avatar trigger visible & reachable on mobile**

The trigger is already shown as the rounded avatar on all sizes (name hidden below `sm`). Keep it, but ensure the dropdown never renders off-screen: because it is `right-0` inside the header's `relative` container and the header has `px-4`, `max-w-[calc(100vw-2rem)]` is sufficient. Verify there is no `overflow-hidden` ancestor clipping the menu in `DashboardLayout` (there is not).

- [ ] **Step 3: Manual smoke check + verify**

Run (workdir `frontend`): `npm run typecheck`, `npm run build`, `npm run lint`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/Header.tsx
git commit -m "fix(ui): keep user dropdown inside viewport on small screens (F5)"
```

---

### Task 10: F3/F4 — Frontend semester sequencing + supervisor gate

**Files:**
- Modify: `frontend/src/pages/student/StudentCourses.tsx`
- Modify: `frontend/src/pages/student/StudentThesis.tsx`
- Modify: `frontend/src/pages/student/StudentDashboard.tsx` (supervisor banner, optional)

**Interfaces:**
- Consumes: `studentApi.getProfile` returns profile with `supervisor` (existing `StudentProfileView` type already has `supervisor?`).

- [ ] **Step 1: Courses page**

- Fetch profile with `useApi(studentApi.getProfile)` alongside semesters.
- In the "Add Semester" modal: remove the `Semester Number` input; compute `const nextSemester = semesterList.reduce((max, s) => Math.max(max, s.semesterNumber), 0) + 1;` and show it as read-only text (`<p className="text-sm text-gray-700">Semester {nextSemester} will be added.</p>`); send `semesterNumber: nextSemester` on submit.
- **Supervisor gate:** if `profile && !profile.supervisor`, hide the "Request Course" button and replace the page intro with an `Alert`/`EmptyState`:

```tsx
<Alert variant="info">A supervisor must be assigned before you can request courses.</Alert>
```

- [ ] **Step 2: Thesis page**

- Fetch profile; if no supervisor, hide "Submit Thesis" and show the same info alert.

- [ ] **Step 3: Dashboard banner (optional but recommended for F7 discoverability)**

On `StudentDashboard`, the profile from `getDashboard` already includes `profile.isProfileComplete` and `profile.supervisor`. Add two non-blocking notices:
- `!profile.isProfileComplete` → yellow banner linking to `/student/complete-profile`.
- `!profile.supervisor` → gray/info banner "Awaiting supervisor assignment."

- [ ] **Step 4: Verify + commit**

Run (workdir `frontend`): `npm run typecheck`, `npm run build`, `npm run lint`, `npm test`.

```bash
git add frontend/src/pages/student/StudentCourses.tsx frontend/src/pages/student/StudentThesis.tsx frontend/src/pages/student/StudentDashboard.tsx
git commit -m "feat(student): semester sequencing UI and supervisor gate (F3 F4)"
```

---

### Task 11: F7 — Onboarding wizard

**Files:**
- Create: `frontend/src/pages/student/StudentOnboarding.tsx`
- Modify: `frontend/src/App.tsx` (route)
- Modify: `frontend/src/api/student.ts` (`updateProfile` payload types)
- Modify: `frontend/src/components/layout/navConfig.ts` (nav item, only for students with incomplete profile)

**Interfaces:**
- Consumes: `studentApi.updateProfile` extended payload; `AuthUser.isProfileComplete`.
- Produces: route `/student/complete-profile` (lazy-loaded), wizard saving via `PUT /student/profile`.

- [ ] **Step 1: Extend `frontend/src/api/student.ts`**

```ts
import type { StudentProfileUpdate } from '../types';
updateProfile: (payload: StudentProfileUpdate) =>
  apiFetch<StudentProfileView>('/student/profile', { method: 'PUT', body: payload }),
```

Add to `frontend/src/types/index.ts`:

```ts
export interface StudentProfileUpdate {
  name?: string;
  researchArea?: string;
  profilePhoto?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  category?: string;
  phone?: string;
  address?: string;
  lastDegree?: string;
  institution?: string;
  graduationYear?: number;
  qualification?: string;
}
```

- [ ] **Step 2: Create `frontend/src/pages/student/StudentOnboarding.tsx`**

```tsx
import { useState } from 'react';
import type { FormEvent, JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { studentApi } from '../../api/student';
import { PageHeader } from '../../components/shared/PageHeader';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

const STEPS = ['Personal', 'Academics', 'Contact'] as const;

export interface OnboardingForm {
  profilePhoto: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  category: string;
  lastDegree: string;
  institution: string;
  graduationYear: string;
  qualification: string;
  researchArea: string;
  phone: string;
  address: string;
}

const emptyForm: OnboardingForm = {
  profilePhoto: '',
  dateOfBirth: '',
  gender: '',
  bloodGroup: '',
  category: '',
  lastDegree: '',
  institution: '',
  graduationYear: '',
  qualification: '',
  researchArea: '',
  phone: '',
  address: '',
};

const GENDER_OPTIONS = [{ value: '', label: 'Select gender' }, { value: 'Female', label: 'Female' }, { value: 'Male', label: 'Male' }, { value: 'Other', label: 'Other' }];
const BLOOD_GROUP_OPTIONS = [{ value: '', label: 'Select blood group' }, { value: 'A+', label: 'A+' }, { value: 'A-', label: 'A-' }, { value: 'B+', label: 'B+' }, { value: 'B-', label: 'B-' }, { value: 'AB+', label: 'AB+' }, { value: 'AB-', label: 'AB-' }, { value: 'O+', label: 'O+' }, { value: 'O-', label: 'O-' }];
const CATEGORY_OPTIONS = [{ value: '', label: 'Select category' }, { value: 'General', label: 'General' }, { value: 'OBC', label: 'OBC' }, { value: 'SC', label: 'SC' }, { value: 'ST', label: 'ST' }, { value: 'EWS', label: 'EWS' }];

export function StudentOnboarding(): JSX.Element {
  const navigate = useNavigate();
  const { reload } = useAuth();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setField = (field: keyof OnboardingForm) => (event: { target: { value: string } }) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    if (serverError) setServerError(null);
  };

  const stepValid = (): boolean => {
    const next: Record<string, string> = {};
    if (step === 0) {
      if (!form.dateOfBirth) next.dateOfBirth = 'Date of birth is required.';
      if (!form.gender) next.gender = 'Gender is required.';
      if (!form.bloodGroup) next.bloodGroup = 'Blood group is required.';
      if (!form.category) next.category = 'Category is required.';
    } else if (step === 1) {
      if (!form.lastDegree) next.lastDegree = 'Last degree is required.';
      if (!form.institution) next.institution = 'Institution is required.';
      const year = Number(form.graduationYear);
      if (!form.graduationYear) next.graduationYear = 'Graduation year is required.';
      else if (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear()) {
        next.graduationYear = 'Enter a valid graduation year.';
      }
    } else {
      if (!form.phone) next.phone = 'Phone number is required.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleNext = () => {
    if (stepValid()) setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !stepValid()) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await studentApi.updateProfile({
        profilePhoto: form.profilePhoto.trim() || undefined,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        bloodGroup: form.bloodGroup,
        category: form.category,
        lastDegree: form.lastDegree,
        institution: form.institution,
        graduationYear: Number(form.graduationYear),
        qualification: form.qualification.trim() || undefined,
        researchArea: form.researchArea.trim() || undefined,
        phone: form.phone.trim(),
        address: form.address.trim() || undefined,
      });
      await reload();
      navigate('/student/profile', { replace: true });
    } catch (err) {
      setSubmitting(false);
      setServerError(err instanceof Error ? err.message : 'Unable to save your profile. Please try again.');
    }
  };

  const stepFields: Record<number, { label: string; id: string; field: keyof OnboardingForm; placeholder?: string }[]> = {
    0: [
      { label: 'Date of Birth', id: 'ob-dob', field: 'dateOfBirth', placeholder: '2000-01-15' },
      { label: 'Profile Photo URL', id: 'ob-photo', field: 'profilePhoto', placeholder: 'https://example.com/photo.jpg' },
    ],
    1: [
      { label: 'Last Degree', id: 'ob-degree', field: 'lastDegree', placeholder: 'e.g. M.Tech' },
      { label: 'Institution', id: 'ob-institution', field: 'institution', placeholder: 'e.g. NIT Jamshedpur' },
      { label: 'Graduation Year', id: 'ob-year', field: 'graduationYear', placeholder: 'e.g. 2022' },
      { label: 'Qualification / Score', id: 'ob-qual', field: 'qualification', placeholder: 'e.g. CGPA 9.2' },
      { label: 'Research Area', id: 'ob-research', field: 'researchArea', placeholder: 'e.g. Machine Learning' },
    ],
    2: [
      { label: 'Phone', id: 'ob-phone', field: 'phone', placeholder: 'e.g. 98765 43210' },
      { label: 'Address', id: 'ob-address', field: 'address', placeholder: 'City, State' },
    ],
  };

  return (
    <>
      <PageHeader
        title="Complete your profile"
        description="Tell us a bit more so your department record is complete."
      />

      <Card>
        <ol className="mb-6 flex items-center gap-2 text-sm" aria-label="Progress">
          {STEPS.map((label, index) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className={
                  index === step
                    ? 'rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-medium text-white'
                    : 'rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600'
                }
              >
                {index + 1}
              </span>
              <span className={index === step ? 'font-medium text-gray-900' : 'text-gray-500'}>{label}</span>
              {index < STEPS.length - 1 && <span className="text-gray-300">·</span>}
            </li>
          ))}
        </ol>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {serverError && <Alert variant="error">{serverError}</Alert>}

          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input id="ob-dob" label="Date of Birth" type="date" value={form.dateOfBirth} onChange={setField('dateOfBirth')} error={errors.dateOfBirth} />
              <Input id="ob-photo" label="Profile Photo URL" type="url" value={form.profilePhoto} onChange={setField('profilePhoto')} error={errors.profilePhoto} placeholder="https://example.com/photo.jpg" />
              <Select id="ob-gender" label="Gender" value={form.gender} onChange={setField('gender')} error={errors.gender} options={GENDER_OPTIONS} />
              <Select id="ob-blood" label="Blood Group" value={form.bloodGroup} onChange={setField('bloodGroup')} error={errors.bloodGroup} options={BLOOD_GROUP_OPTIONS} />
              <Select id="ob-category" label="Category" value={form.category} onChange={setField('category')} error={errors.category} options={CATEGORY_OPTIONS} />
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {stepFields[1].map(({ label, id, field, placeholder }) => (
                <Input key={id} id={id} label={label} value={String(form[field])} onChange={setField(field)} error={errors[field]} placeholder={placeholder} />
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {stepFields[2].map(({ label, id, field, placeholder }) => (
                <Input key={id} id={id} label={label} value={String(form[field])} onChange={setField(field)} error={errors[field]} placeholder={placeholder} />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="secondary" onClick={() => (step === 0 ? navigate('/student') : setStep((prev) => prev - 1))} disabled={submitting}>
              {step === 0 ? 'Skip for now' : 'Back'}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save profile'}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </>
  );
}

export default StudentOnboarding;
```

Note: `Select` (checked `frontend/src/components/ui/Select.tsx`) has no `placeholder`/`emptyLabel` props — hence the leading `{ value: '', label: 'Select…' }` option in each options array. The empty-string value also forces the "required" validation to trigger for gender/bloodGroup/category.

- [ ] **Step 3: Register the route** in `frontend/src/App.tsx`:

```ts
const StudentOnboarding = lazy(() => import('./pages/student/StudentOnboarding'));
// inside the /student route group:
<Route path="complete-profile" element={<StudentOnboarding />} />
```

- [ ] **Step 4: Verify + commit**

Run (workdir `frontend`): `npm run typecheck`, `npm run build`, `npm run lint`, `npm test`.

```bash
git add frontend/src/pages/student/StudentOnboarding.tsx frontend/src/App.tsx frontend/src/api/student.ts frontend/src/types/index.ts frontend/src/components/layout/navConfig.ts
git commit -m "feat(student): post-registration onboarding wizard (F7)"
```

---

### Task 12: Update documentation (backend.md / context.md)

**Files:**
- Modify: `backend.md` (login/register bodies now return `accessToken`/`refreshToken`; new `/auth/refresh` + `/auth/logout`; semester sequencing; supervisor gate; profile fields)
- Modify: `context.md` (new features, new env vars, test counts)

- [ ] **Step 1: Update `backend.md`**

- Auth table: add `POST /refresh`, `POST /logout`.
- Login/register response shapes: `{ accessToken, refreshToken, user }`.
- Student routes notes: semester sequencing rule; supervisor gate on thesis/courses/documents; profile update fields.

- [ ] **Step 2: Update `context.md`**

Append a new section describing F1–F8, note new env vars (`JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `JWT_REFRESH_SECRET`), and update test counts/status lines.

- [ ] **Step 3: Commit**

```bash
git add backend.md context.md
git commit -m "docs: document auth refresh tokens and new feature behaviors"
```

---

## FINAL VERIFICATION

- Backend (workdir `backend`): `npm run typecheck`, `npm run build`, `npm test` — all PASS.
- Frontend (workdir `frontend`): `npm run typecheck`, `npm run build`, `npm run lint` (existing 1 accepted warning only), `npm test` — all PASS.
- Mandatory reviewers per AGENTS.md:
  - Aesthetic/UX reviewer — sidebar identity, dropdown, onboarding wizard, avatar usage, error copy.
  - Performance reviewer — single-flight refresh, no new deps, no heavy lists, lazy-loaded wizard.
  - Code-quality reviewer — token utilities, `applyServerError` typing, wizard structure.
  - Accessibility reviewer — PasswordInput toggle (label + focus), dropdown semantics, wizard step labels, error `aria-describedby`.
- Fix Critical/Important findings, re-run gates, then integrate into `main` per AGENTS.md flow.