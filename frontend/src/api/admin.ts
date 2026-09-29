import { apiFetch, apiUpload, apiDownload } from './client';
import type { ApiOpts } from './client';
import type {
  AdminCreateFaculty,
  AdminCreateStudent,
  AdminDashboardData,
  AdminEventPayload,
  AdminUpdateFaculty,
  AdminUpdateStudent,
  AuthUser,
  BulkImportReport,
  Deadline,
  DeadlineFields,
  EventView,
  ExaminerCategory,
  ExternalExaminer,
  ExternalExaminerStatus,
  FacultyView,
  Form,
  FormFields,
  Internship,
  Milestone,
  MilestoneStatus,
  Pagination,
  ScholarDueItem,
  SRCMemberRole,
  SRCCommittee,
  StudentProfileView,
  SupervisorRecord,
} from '../types';

export const adminApi = {
  getDashboard: (opts?: ApiOpts) => apiFetch<AdminDashboardData>('/admin/dashboard', { signal: opts?.signal }),
  listStudents: (params: { search?: string; studentType?: string; department?: string; page?: number; limit?: number; fields?: string } = {}, opts?: ApiOpts) =>
    apiFetch<{ students: StudentProfileView[]; pagination: Pagination }>('/admin/students', { query: params, signal: opts?.signal }),
  createStudent: (payload: AdminCreateStudent) =>
    apiFetch<{ user: AuthUser; profile: StudentProfileView }>('/admin/students', { method: 'POST', body: payload }),
  updateStudent: (id: string, payload: AdminUpdateStudent) =>
    apiFetch<StudentProfileView>(`/admin/students/${id}`, { method: 'PUT', body: payload }),
  toggleStudentActive: (userId: string) =>
    apiFetch<{ id: string; isActive: boolean }>(`/admin/students/${userId}/toggle-active`, { method: 'PUT' }),
  listFaculty: (params: { search?: string; department?: string; page?: number; limit?: number; fields?: string } = {}, opts?: ApiOpts) =>
    apiFetch<{ faculty: FacultyView[]; pagination: Pagination }>('/admin/faculty', { query: params, signal: opts?.signal }),
  createFaculty: (payload: AdminCreateFaculty) =>
    apiFetch<{ user: AuthUser; profile: FacultyView }>('/admin/faculty', { method: 'POST', body: payload }),
  updateFaculty: (id: string, payload: AdminUpdateFaculty) =>
    apiFetch<FacultyView>(`/admin/faculty/${id}`, { method: 'PUT', body: payload }),
  toggleFacultyActive: (userId: string) =>
    apiFetch<{ id: string; isActive: boolean }>(`/admin/faculty/${userId}/toggle-active`, { method: 'PUT' }),
  assignSupervisor: (payload: { studentId: string; supervisorId: string; coSupervisorId?: string }) =>
    apiFetch<SupervisorRecord>('/admin/supervisor/assign', { method: 'POST', body: payload }),
  createSRCCommittee: (payload: { studentId: string; members: { faculty: string; role: SRCMemberRole }[] }) =>
    apiFetch<SRCCommittee>('/admin/src-committee', { method: 'POST', body: payload }),
  updateSRCCommittee: (id: string, members: { faculty: string; role: SRCMemberRole }[]) =>
    apiFetch<SRCCommittee>(`/admin/src-committee/${id}`, { method: 'PUT', body: { members } }),
  getStudentMilestones: (studentId: string, opts?: ApiOpts) =>
    apiFetch<Milestone[]>(`/admin/students/${studentId}/milestones`, { signal: opts?.signal }),
  updateMilestone: (
    id: string,
    payload: { status?: MilestoneStatus; dueDate?: string; title?: string; description?: string }
  ) => apiFetch<Milestone>(`/admin/milestones/${id}`, { method: 'PUT', body: payload }),
  listEvents: (params: { page?: number; limit?: number } = {}, opts?: ApiOpts) =>
    apiFetch<{ events: EventView[]; pagination: Pagination }>('/admin/events', { query: params, signal: opts?.signal }),
  createEvent: (payload: AdminEventPayload) =>
    apiFetch<EventView>('/admin/events', { method: 'POST', body: payload }),
  updateEvent: (id: string, payload: Record<string, unknown>) =>
    apiFetch<EventView>(`/admin/events/${id}`, { method: 'PUT', body: payload }),
  deleteEvent: (id: string) => apiFetch<{ message: string }>(`/admin/events/${id}`, { method: 'DELETE' }),
  listForms: (params: { page?: number; limit?: number } = {}, opts?: ApiOpts) =>
    apiFetch<{ forms: Form[]; pagination: Pagination }>('/admin/forms', { query: params, signal: opts?.signal }),
  createForm: (payload: FormFields) => apiFetch<Form>('/admin/forms', { method: 'POST', body: payload }),
  updateForm: (id: string, payload: Record<string, unknown>) =>
    apiFetch<Form>(`/admin/forms/${id}`, { method: 'PUT', body: payload }),
  deleteForm: (id: string) => apiFetch<{ message: string }>(`/admin/forms/${id}`, { method: 'DELETE' }),
  listDeadlines: (params: { page?: number; limit?: number } = {}, opts?: ApiOpts) =>
    apiFetch<{ deadlines: Deadline[]; pagination: Pagination }>('/admin/deadlines', { query: params, signal: opts?.signal }),
  createDeadline: (payload: Omit<DeadlineFields, 'semester'> & { semester?: number }) =>
    apiFetch<Deadline>('/admin/deadlines', { method: 'POST', body: payload }),
  globalSearch: (q: string, opts?: ApiOpts) =>
    apiFetch<{ students: unknown[]; faculty: unknown[] }>('/admin/search', { query: { q }, signal: opts?.signal }),
  downloadBulkImportTemplate: (type: 'students' | 'faculty' | 'events') =>
    apiDownload(`/admin/bulk-import/template/${type}`),
  bulkImport: (type: 'students' | 'faculty' | 'events', file: File) =>
    apiUpload<BulkImportReport>(`/admin/bulk-import/${type}`, file),
  getDepartmentDues: (opts?: ApiOpts) =>
    apiFetch<{ dues: ScholarDueItem[]; overdueCount: number; dueSoonCount: number; expiringRegistrationCount: number }>('/admin/dues', { signal: opts?.signal }),
  listExternalExaminers: (params: { thesisId?: string; studentId?: string } = {}, opts?: ApiOpts) =>
    apiFetch<ExternalExaminer[]>('/admin/examiners', { query: params, signal: opts?.signal }),
  getExternalExaminers: (opts?: ApiOpts) =>
    apiFetch<ExternalExaminer[]>('/admin/examiners', { signal: opts?.signal }),
  addExternalExaminer: (payload: { thesisId: string; studentId: string; examinerName: string; examinerEmail: string; institution: string; invitationDate?: string }) =>
    apiFetch<ExternalExaminer>('/admin/examiners', { method: 'POST', body: payload }),
  updateExternalExaminer: (id: string, payload: { status?: ExternalExaminerStatus; category?: ExaminerCategory; reportUrl?: string; remarks?: string }) =>
    apiFetch<ExternalExaminer>(`/admin/examiners/${id}`, { method: 'PUT', body: payload }),
  listAllInternships: (opts?: ApiOpts) =>
    apiFetch<Internship[]>('/admin/internships', { signal: opts?.signal }),
  adminReviewInternship: (id: string, payload: { status: 'admin_approved' | 'rejected'; adminComment?: string }) =>
    apiFetch<Internship>(`/admin/internships/${id}/review`, { method: 'PUT', body: payload }),
  reviewInternship: (id: string, payload: { status: 'admin_approved' | 'rejected'; adminComment?: string }) =>
    apiFetch<Internship>(`/admin/internships/${id}/review`, { method: 'PUT', body: payload }),
};