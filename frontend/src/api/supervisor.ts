import { apiFetch } from './client';
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
  getDashboard: () => apiFetch<SupervisorDashboardData>('/supervisor/dashboard'),
  getStudents: (params: { name?: string; rollNumber?: string; semester?: string; studentType?: string; researchArea?: string; page?: number; limit?: number } = {}) =>
    apiFetch<{ students: StudentListItem[]; pagination: Pagination }>('/supervisor/students', { query: params }),
  getStudentOptions: () => apiFetch<StudentOption[]>('/supervisor/students/options'),
  getStudentDetail: (studentId: string) => apiFetch<SupervisorStudentDetail>(`/supervisor/students/${studentId}`),
  approveCourse: (studentCourseId: string, payload: { status: 'approved' | 'rejected'; comment?: string }) =>
    apiFetch<{ message: string; studentCourse: StudentCourse }>(`/supervisor/courses/${studentCourseId}/approve`, { method: 'PUT', body: payload }),
  approveThesis: (thesisId: string, payload: { status: 'approved' | 'rejected' | 'resubmission_required'; comment?: string }) =>
    apiFetch<{ message: string; thesis: Thesis }>(`/supervisor/thesis/${thesisId}/approve`, { method: 'PUT', body: payload }),
  approveRequest: (requestId: string, payload: { status: 'approved' | 'rejected'; comment?: string }) =>
    apiFetch<{ message: string; approvalRequest: ApprovalRequestView }>(`/supervisor/approvals/${requestId}/approve`, { method: 'PUT', body: payload }),
  getPendingApprovals: () => apiFetch<PendingApprovals>('/supervisor/approvals/pending'),
  createEvent: (payload: SupervisorEventPayload) =>
    apiFetch<EventView>('/supervisor/events', { method: 'POST', body: payload }),
  getEvents: (params: { page?: number; limit?: number; eventType?: string } = {}) =>
    apiFetch<{ events: EventView[]; pagination: Pagination }>('/supervisor/events', { query: params }),
};
