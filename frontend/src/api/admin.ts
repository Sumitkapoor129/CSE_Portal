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
  FacultyView,
  Form,
  FormFields,
  Pagination,
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
};