import { apiFetch } from './client';
import type { ApiOpts } from './client';
import type {
  ApprovalRequestView,
  EventView,
  Pagination,
  PendingApprovals,
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
};
