# Task 2 Brief: Core domain types, API client, and utilities

Full plan: `docs/superpowers/plans/2026-09-08-frontend-implementation.md` (lines 345–1007)
Spec (design/API mapping): `docs/superpowers/specs/2026-09-08-frontend-design.md`
Backend type sources of truth: `C:\Users\91983\Desktop\VibeCoded\CSE_portal\src\types\index.ts`, `src\routes\*.ts`, `src\controllers\*.ts`

IMPORTANT REPO RULES:
- This repo has NO git. Do NOT run `git add`/`git commit`/`git init`. Skip the plan's commit step.
- Work from repo root `C:\Users\91983\Desktop\VibeCoded\CSE_portal`. All frontend code goes under `frontend/`.
- NEVER add code comments. No emoji.
- TDD: write the failing tests FIRST, run them to confirm FAIL (module not found), then implement, then confirm PASS.
- Success envelope from backend: `{ success: true, data }`; error envelope: `{ message }`.
- Tailwind v4 scans for complete literal class tokens. NEVER build class names at runtime (no `bg-${color}-50`). Every class must appear as a full literal string in the source.
- On 401 the client MUST `clearStoredToken()` and `window.dispatchEvent(new CustomEvent('auth:unauthorized'))` — it must NOT mutate `window.location` (breaks jsdom tests; AuthContext listens for the event in a later task).

## Known environment note (deviation from plan order, INSTRUCTED)
The plan says Task 3 adds `jsdom`. BUT `client.test.ts` uses the `// @vitest-environment jsdom` pragma and Vitest needs the `jsdom` package installed to run it. Therefore install `jsdom` as a devDependency NOW in Task 2 (`npm install -D jsdom@^25`). This is a required, plan-consistent fix — do not skip it. If `npm test` still fails for another reason, fix causally and re-run.

## Goal
Create `frontend/src/types/index.ts`, `frontend/src/api/client.ts`, `frontend/src/utils/formatDate.ts`, `frontend/src/utils/constants.ts`, `frontend/src/utils/validators.ts`, plus tests `client.test.ts`, `formatDate.test.ts`, `validators.test.ts`. All lint, tests, and build green at the end.

## Step 1 — Write the three test files first (TDD)

### `frontend/src/api/client.test.ts`
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

### `frontend/src/utils/formatDate.test.ts`
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

### `frontend/src/utils/validators.test.ts`
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

Run `npm test` (workdir `frontend`) → EXPECTED: FAIL (modules `./client`, `./formatDate`, `./validators` not found).

## Step 2 — Implement (exact contents)

### `frontend/src/api/client.ts`
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

### `frontend/src/utils/formatDate.ts`
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

### `frontend/src/utils/validators.ts`
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

### `frontend/src/utils/constants.ts`
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

### `frontend/src/types/index.ts`
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

## Step 3 — Run all tests (`npm test`), expect all PASS.

## Step 4 — `npm run lint` (clean) and `npm run build` (succeeds) and `npm run typecheck` (clean).

## Report back
State, in your final message:
1. Each file created (paths).
2. That tests were first observed RED (list the failing module names), then GREEN.
3. Exact verification output: `npm test`, `npm run lint`, `npm run build`, `npm run typecheck`.
4. Confirm `jsdom@^25` was added to package.json devDependencies.
5. Any deviations from the brief and why.