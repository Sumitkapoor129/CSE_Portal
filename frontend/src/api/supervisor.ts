import { apiFetch } from './client';
import type { ApiOpts } from './client';
import type {
  ApprovalRequestView,
  ComprehensiveExam,
  ComprehensiveExamResult,
  EventView,
  Internship,
  Pagination,
  PendingApprovals,
  ScholarDueItem,
  StudentCourse,
  StudentListItem,
  StudentOption,
  SupervisorDashboardData,
  SupervisorEventPayload,
  SupervisorStudentDetail,
  Thesis,
} from '../types';

export const supervisorApi = {
  getDashboard: (opts?: ApiOpts) => apiFetch<SupervisorDashboardData>('/supervisor/dashboard', { signal: opts?.signal }),
  getStudents: (params: { name?: string; rollNumber?: string; semester?: string; studentType?: string; researchArea?: string; page?: number; limit?: number } = {}, opts?: ApiOpts) =>
    apiFetch<{ students: StudentListItem[]; pagination: Pagination }>('/supervisor/students', { query: params, signal: opts?.signal }),
  getStudentOptions: (opts?: ApiOpts) => apiFetch<StudentOption[]>('/supervisor/students/options', { signal: opts?.signal }),
  getStudentDetail: (studentId: string, opts?: ApiOpts) => apiFetch<SupervisorStudentDetail>(`/supervisor/students/${studentId}`, { signal: opts?.signal }),
  approveCourse: (studentCourseId: string, payload: { status: 'approved' | 'rejected'; comment?: string }) =>
    apiFetch<{ message: string; studentCourse: StudentCourse }>(`/supervisor/courses/${studentCourseId}/approve`, { method: 'PUT', body: payload }),
  approveThesis: (thesisId: string, payload: { status: 'approved' | 'rejected' | 'resubmission_required'; comment?: string }) =>
    apiFetch<{ message: string; thesis: Thesis }>(`/supervisor/thesis/${thesisId}/approve`, { method: 'PUT', body: payload }),
  approveRequest: (requestId: string, payload: { status: 'approved' | 'rejected'; comment?: string }) =>
    apiFetch<{ message: string; approvalRequest: ApprovalRequestView }>(`/supervisor/approvals/${requestId}/approve`, { method: 'PUT', body: payload }),
  getPendingApprovals: (opts?: ApiOpts) => apiFetch<PendingApprovals>('/supervisor/approvals/pending', { signal: opts?.signal }),
  createEvent: (payload: SupervisorEventPayload) =>
    apiFetch<EventView>('/supervisor/events', { method: 'POST', body: payload }),
  getEvents: (params: { page?: number; limit?: number; eventType?: string } = {}, opts?: ApiOpts) =>
    apiFetch<{ events: EventView[]; pagination: Pagination }>('/supervisor/events', { query: params, signal: opts?.signal }),
  getAssignedScholarsDues: (opts?: ApiOpts) =>
    apiFetch<{ dues: ScholarDueItem[]; criticalCount: number; warningCount: number }>('/supervisor/dues', { signal: opts?.signal }),
  recordComprehensiveExamResult: (payload: { studentId: string; attemptNumber: number; examDate: string; result: ComprehensiveExamResult; remarks?: string }) =>
    apiFetch<ComprehensiveExam>('/supervisor/comprehensive-exam', { method: 'POST', body: payload }),
  recordComprehensiveExam: (payload: { studentId: string; attemptNumber: number; examDate: string; result: ComprehensiveExamResult; remarks?: string }) =>
    apiFetch<ComprehensiveExam>('/supervisor/comprehensive-exam', { method: 'POST', body: payload }),
  getStudentComprehensiveExams: (studentId: string, opts?: ApiOpts) =>
    apiFetch<ComprehensiveExam[]>(`/supervisor/students/${studentId}/comprehensive-exams`, { signal: opts?.signal }),
  listScholarInternships: (opts?: ApiOpts) =>
    apiFetch<Internship[]>('/supervisor/internships', { signal: opts?.signal }),
  reviewInternship: (id: string, payload: { status: 'supervisor_approved' | 'rejected'; supervisorComment?: string }) =>
    apiFetch<Internship>(`/supervisor/internships/${id}/review`, { method: 'PUT', body: payload }),
};

