import { apiFetch } from './client';
import type {
  Course,
  Credits,
  CreditsListResponse,
  Deadline,
  DocumentView,
  EventView,
  Form,
  Milestone,
  Notification,
  Semester,
  StudentDashboardData,
  StudentProfileView,
  Thesis,
  TimelineItem,
} from '../types';

export const studentApi = {
  getDashboard: () => apiFetch<StudentDashboardData>('/student/dashboard'),
  getProfile: () => apiFetch<StudentProfileView>('/student/profile'),
  updateProfile: (payload: { name?: string; researchArea?: string; profilePhoto?: string }) =>
    apiFetch<StudentProfileView>('/student/profile', { method: 'PUT', body: payload }),
  getSemesters: () => apiFetch<Semester[]>('/student/semesters'),
  createSemester: (payload: { semesterNumber: number; academicYear: string; startDate: string; endDate: string }) =>
    apiFetch<Semester>('/student/semesters', { method: 'POST', body: payload }),
  getCourses: (semesterId: string) => apiFetch<Course[]>(`/student/semesters/${semesterId}/courses`),
  addCourse: (semesterId: string, payload: { courseCode: string; courseName: string; credits: number }) =>
    apiFetch<Course>(`/student/semesters/${semesterId}/courses`, { method: 'POST', body: payload }),
  getCredits: (semesterId?: string) =>
    apiFetch<CreditsListResponse | Credits>('/student/credits', semesterId ? { query: { semesterId } } : undefined),
  getDocuments: () => apiFetch<DocumentView[]>('/student/documents'),
  uploadDocument: (payload: { documentName: string; documentType: string; fileUrl: string; semester?: string }) =>
    apiFetch<DocumentView>('/student/documents', { method: 'POST', body: payload }),
  getTheses: () => apiFetch<Thesis[]>('/student/thesis'),
  submitThesis: (payload: { title: string; documentUrl: string }) =>
    apiFetch<Thesis>('/student/thesis', { method: 'POST', body: payload }),
  getTimeline: () => apiFetch<TimelineItem[]>('/student/timeline'),
  getMilestones: () => apiFetch<Milestone[]>('/student/milestones'),
  getEvents: (upcoming?: boolean) =>
    apiFetch<EventView[]>('/student/events', upcoming ? { query: { upcoming } } : undefined),
  getDeadlines: (upcoming?: boolean) =>
    apiFetch<Deadline[]>('/student/deadlines', upcoming ? { query: { upcoming } } : undefined),
  getForms: () => apiFetch<Form[]>('/student/forms'),
  getNotifications: () => apiFetch<Notification[]>('/student/notifications'),
  markNotificationRead: (id: string) => apiFetch<Notification>(`/student/notifications/${id}/read`, { method: 'PUT' }),
};