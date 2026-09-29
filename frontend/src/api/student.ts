import { apiFetch } from './client';
import type { ApiOpts } from './client';
import type {
  ComprehensiveExam,
  Course,
  Credits,
  CreditsListResponse,
  Deadline,
  DocumentView,
  EventView,
  Form,
  Internship,
  Milestone,
  MilestoneTimelineView,
  Notification,
  Semester,
  StudentDashboardData,
  StudentProfileUpdate,
  StudentProfileView,
  Thesis,
  TimelineItem,
} from '../types';

export const studentApi = {
  getDashboard: (opts?: ApiOpts) => apiFetch<StudentDashboardData>('/student/dashboard', { signal: opts?.signal }),
  getProfile: (opts?: ApiOpts) => apiFetch<StudentProfileView>('/student/profile', { signal: opts?.signal }),
  updateProfile: (payload: StudentProfileUpdate) =>
    apiFetch<StudentProfileView>('/student/profile', { method: 'PUT', body: payload }),
  getSemesters: (opts?: ApiOpts) => apiFetch<Semester[]>('/student/semesters', { signal: opts?.signal }),
  createSemester: (payload: { semesterNumber: number; academicYear: string; startDate: string; endDate: string }) =>
    apiFetch<Semester>('/student/semesters', { method: 'POST', body: payload }),
  getCourses: (semesterId: string, opts?: ApiOpts) => apiFetch<Course[]>(`/student/semesters/${semesterId}/courses`, { signal: opts?.signal }),
  addCourse: (semesterId: string, payload: { courseCode: string; courseName: string; credits: number }) =>
    apiFetch<Course>(`/student/semesters/${semesterId}/courses`, { method: 'POST', body: payload }),
  getCredits: (semesterId?: string, opts?: ApiOpts) =>
    apiFetch<CreditsListResponse | Credits>('/student/credits', { ...(semesterId ? { query: { semesterId } } : {}), signal: opts?.signal }),
  getDocuments: (opts?: ApiOpts) => apiFetch<DocumentView[]>('/student/documents', { signal: opts?.signal }),
  uploadDocument: (payload: { documentName: string; documentType: string; fileUrl: string; semester?: string }) =>
    apiFetch<DocumentView>('/student/documents', { method: 'POST', body: payload }),
  getTheses: (opts?: ApiOpts) => apiFetch<Thesis[]>('/student/thesis', { signal: opts?.signal }),
  submitThesis: (payload: { title: string; documentUrl: string }) =>
    apiFetch<Thesis>('/student/thesis', { method: 'POST', body: payload }),
  getTimeline: (opts?: ApiOpts) => apiFetch<TimelineItem[]>('/student/timeline', { signal: opts?.signal }),
  getMilestones: (opts?: ApiOpts) => apiFetch<Milestone[]>('/student/milestones', { signal: opts?.signal }),
  getMilestoneTimeline: (opts?: ApiOpts) => apiFetch<MilestoneTimelineView>('/student/milestones/timeline', { signal: opts?.signal }),
  completeMilestone: (id: string, payload: { completedDate?: string }) =>
    apiFetch<Milestone>(`/student/milestones/${id}/complete`, { method: 'PUT', body: payload }),
  updateMilestoneDate: (id: string, payload: { dueDate?: string | null }) =>
    apiFetch<Milestone>(`/student/milestones/${id}`, { method: 'PUT', body: payload }),
  getEvents: (upcoming?: boolean, opts?: ApiOpts) =>
    apiFetch<EventView[]>('/student/events', { ...(upcoming ? { query: { upcoming } } : {}), signal: opts?.signal }),
  getDeadlines: (upcoming?: boolean, opts?: ApiOpts) =>
    apiFetch<Deadline[]>('/student/deadlines', { ...(upcoming ? { query: { upcoming } } : {}), signal: opts?.signal }),
  getForms: (opts?: ApiOpts) => apiFetch<Form[]>('/student/forms', { signal: opts?.signal }),
  getNotifications: (opts?: ApiOpts) => apiFetch<Notification[]>('/student/notifications', { signal: opts?.signal }),
  getUnreadNotificationCount: (opts?: ApiOpts) =>
    apiFetch<{ unread: number }>('/student/notifications/unread-count', { signal: opts?.signal }),
  markNotificationRead: (id: string) => apiFetch<Notification>(`/student/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => apiFetch<{ updated: number }>('/student/notifications/read-all', { method: 'PUT' }),
  getMyInternships: (opts?: ApiOpts) => apiFetch<Internship[]>('/student/internships', { signal: opts?.signal }),
  createInternshipRequest: (payload: { organization: string; researchTopic: string; startDate: string; endDate: string }) =>
    apiFetch<Internship>('/student/internships', { method: 'POST', body: payload }),
  getMyComprehensiveExams: (opts?: ApiOpts) => apiFetch<ComprehensiveExam[]>('/student/comprehensive-exams', { signal: opts?.signal }),
};