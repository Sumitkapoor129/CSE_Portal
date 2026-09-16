import type {
  ApprovalStatus,
  EventType,
  FacultyShort,
  MilestoneStatus,
  SRCMemberRole,
  StudentType,
  ThesisStatus,
  UserRole,
} from '../types';

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

export const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'seminar', label: EVENT_TYPE_LABELS.seminar },
  { value: 'comprehensive_exam', label: EVENT_TYPE_LABELS.comprehensive_exam },
  { value: 'progress_review', label: EVENT_TYPE_LABELS.progress_review },
  { value: 'thesis_defense', label: EVENT_TYPE_LABELS.thesis_defense },
  { value: 'course_registration', label: EVENT_TYPE_LABELS.course_registration },
  { value: 'other', label: EVENT_TYPE_LABELS.other },
];

export const STUDENT_TYPE_OPTIONS: { value: StudentType; label: string }[] = [
  { value: 'frp', label: STUDENT_TYPE_LABELS.frp },
  { value: 'erp', label: STUDENT_TYPE_LABELS.erp },
];

export const SRC_ROLE_LABELS: Record<SRCMemberRole, string> = {
  chairperson: 'Chairperson',
  supervisor: 'Supervisor',
  co_supervisor: 'Co-supervisor',
  member: 'Member',
};

export function formatFaculty(faculty: FacultyShort | string | null | undefined): string {
  if (!faculty) return 'Not assigned';
  if (typeof faculty === 'string') return faculty;
  const parts = [faculty.designation, faculty.department].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' · ') : 'Faculty member';
}

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

export const ACTIVE_STATUS_STYLE =
  `${badge} bg-green-50 text-green-700 border-green-200`;

export const INACTIVE_STATUS_STYLE =
  `${badge} bg-gray-50 text-gray-700 border-gray-200`;

export const THESIS_STATUS_STYLE: Record<ThesisStatus, string> = {
  draft: `${badge} bg-gray-50 text-gray-700 border-gray-200`,
  submitted: `${badge} bg-blue-50 text-blue-700 border-blue-200`,
  under_review: `${badge} bg-amber-50 text-amber-700 border-amber-200`,
  approved: `${badge} bg-green-50 text-green-700 border-green-200`,
  rejected: `${badge} bg-red-50 text-red-700 border-red-200`,
  resubmission_required: `${badge} bg-amber-50 text-amber-700 border-amber-200`,
};