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
  profilePhoto?: string | null;
  isProfileComplete?: boolean;
}

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

export interface SupervisorRecord {
  _id: string;
  student: string;
  supervisor: string;
  coSupervisor?: string;
  assignedDate: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
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

export interface StudentDashboardData {
  profile: StudentProfileView;
  currentSemester: Semester | null;
  credits: CreditsSummary;
  milestones: Milestone[];
  nextMilestone: Milestone | null;
  upcomingDeadlines: Deadline[];
  upcomingEvents: EventView[];
  pendingCourseRequests: StudentCourse[];
  thesis: Thesis | null;
  unreadNotifications: number;
}

export type StudentListItem = StudentProfileView;

export interface SupervisorDashboardData {
  assignedStudents: number;
  pendingApprovals: number;
  upcomingEvents: number;
  pendingCourseApprovals: number;
  pendingThesisApprovals: number;
  pendingGeneralApprovals: number;
}

export interface SupervisorStudentDetail {
  profile: StudentProfileView;
  semesters: Semester[];
  courses: StudentCourse[];
  documents: DocumentView[];
  theses: Thesis[];
  srcCommittee: SRCCommittee | null;
  timeline: { semester: Semester; courses: StudentCourse[]; credits: Credits | null }[];
  totalCredits: CreditsSummary;
}

export interface SupervisorEventPayload {
  title: string;
  eventType: EventType;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  participants: string[];
  semester?: string;
  deadline?: string;
}

export interface AdminDashboardData {
  totalStudents: number;
  totalFaculty: number;
  totalEvents: number;
  pendingApprovals: number;
}

export interface AdminCreateStudent {
  email: string;
  password: string;
  name: string;
  collegeId: string;
  rollNumber: string;
  studentType: StudentType;
  department: string;
  researchArea?: string;
  admissionDate?: string;
  requiredCredits?: number;
}

export interface AdminUpdateStudent {
  name?: string;
  email?: string;
  collegeId?: string;
  rollNumber?: string;
  studentType?: StudentType;
  department?: string;
  researchArea?: string;
  profilePhoto?: string;
}

export interface AdminCreateFaculty {
  email: string;
  password: string;
  name: string;
  employeeId: string;
  department: string;
  designation: string;
  researchAreas?: string[];
}

export interface AdminUpdateFaculty {
  name?: string;
  email?: string;
  employeeId?: string;
  department?: string;
  designation?: string;
  researchAreas?: string[];
  profilePhoto?: string;
}

export interface FacultyView {
  _id: string;
  user: UserShort;
  employeeId: string;
  department: string;
  designation: string;
  researchAreas: string[];
  profilePhoto?: string;
}

export interface AdminEventPayload {
  title: string;
  eventType: EventType;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  participants: string[];
  deadline?: string;
}

export interface FormFields {
  formName: string;
  formType: string;
  fileUrl: string;
  semesterApplicable?: number[];
  studentTypeApplicable?: StudentType[];
  department?: string;
}

export interface DeadlineFields {
  title: string;
  description?: string;
  dueDate: string;
  semester?: string;
  student?: string;
}