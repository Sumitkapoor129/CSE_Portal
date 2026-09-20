import { Document } from 'mongoose';
import { Request } from 'express';

export enum UserRole {
  STUDENT = 'student',
  SUPERVISOR = 'supervisor',
  ADMIN = 'admin',
}

export enum StudentType {
  FULL_TIME = 'frp',
  EXTERNAL = 'erp',
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RESUBMISSION_REQUIRED = 'resubmission_required',
}

export enum ThesisStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RESUBMISSION_REQUIRED = 'resubmission_required',
}

export enum EventType {
  SEMINAR = 'seminar',
  COMPREHENSIVE_EXAM = 'comprehensive_exam',
  PROGRESS_REVIEW = 'progress_review',
  THESIS_DEFENSE = 'thesis_defense',
  COURSE_REGISTRATION = 'course_registration',
  OTHER = 'other',
}

export enum SRCMemberRole {
  CHAIRPERSON = 'chairperson',
  SUPERVISOR = 'supervisor',
  CO_SUPERVISOR = 'co_supervisor',
  MEMBER = 'member',
}

export enum MilestoneStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  SKIPPED = 'skipped',
}

export enum MilestoneKey {
  ADMISSION = 'admission',
  SRC_FORMED = 'src_formed',
  COURSE_WORK = 'course_work',
  COMPREHENSIVE_EXAM = 'comprehensive_exam',
  TOPIC_REGISTRATION = 'topic_registration',
  ENHANCEMENT_SEMINAR = 'enhancement_seminar',
  EXTENSION_SEMINAR = 'extension_seminar',
  PRE_SUBMISSION = 'pre_submission',
  THESIS_SUBMITTED = 'thesis_submitted',
  THESIS_APPROVED = 'thesis_approved',
  DEFENSE = 'defense',
  DEGREE_AWARDED = 'degree_awarded',
}

export interface IUser {
  email: string;
  password: string;
  role: UserRole;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRefreshToken {
  user: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStudentProfile {
  user: string;
  collegeId: string;
  rollNumber: string;
  studentType: StudentType;
  department: string;
  researchArea: string;
  admissionDate: Date;
  requiredCredits: number;
  profilePhoto?: string;
  dateOfBirth?: Date;
  gender?: string;
  bloodGroup?: string;
  category?: string;
  phone?: string;
  address?: string;
  lastDegree?: string;
  institution?: string;
  graduationYear?: number;
  qualification?: string;
  supervisor?: string;
  coSupervisor?: string;
  srcCommittee?: string;
  isProfileComplete: boolean;
}

export interface IFacultyProfile {
  user: string;
  employeeId: string;
  department: string;
  designation: string;
  researchAreas: string[];
  profilePhoto?: string;
}

export interface ISemester {
  student: string;
  semesterNumber: number;
  academicYear: string;
  startDate: Date;
  endDate: Date;
}

export interface ICourse {
  semester: string;
  courseCode: string;
  courseName: string;
  credits: number;
  grade?: string;
  status: ApprovalStatus;
}

export interface IStudentCourse {
  student: string;
  course: string;
  semester: string;
  status: ApprovalStatus;
  supervisorComment?: string;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface ICredits {
  student: string;
  semester: string;
  earnedCredits: number;
  requiredCredits: number;
}

export interface IDocument {
  student: string;
  semester?: string;
  documentName: string;
  documentType: string;
  fileUrl: string;
  uploadedBy: string;
  uploadDate: Date;
  approvalStatus: ApprovalStatus;
}

export interface IForm {
  formName: string;
  formType: string;
  fileUrl: string;
  semesterApplicable?: number[];
  studentTypeApplicable?: StudentType[];
  department?: string;
}

export interface IThesis {
  student: string;
  title: string;
  documentUrl: string;
  submissionDate: Date;
  version: number;
  status: ThesisStatus;
  supervisorComments?: string;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface ISupervisor {
  student: string;
  supervisor: string;
  coSupervisor?: string;
  assignedDate: Date;
  isActive: boolean;
}

export interface ISRCCommittee {
  student: string;
  members: ISRCMember[];
  createdAt: Date;
}

export interface ISRCMember {
  faculty: string;
  role: SRCMemberRole;
}

export interface IEvent {
  title: string;
  eventType: EventType;
  description: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  location: string;
  organizer: string;
  organizerModel: 'User';
  participants: IEventParticipant[];
  semester?: string;
  deadline?: Date;
  eligibilityRules?: Record<string, unknown>;
}

export interface IEventParticipant {
  participant: string;
  participantModel: 'User';
}

export interface IDeadline {
  title: string;
  description: string;
  dueDate: Date;
  semester?: number;
  student?: string;
  createdBy: string;
  notificationSent: boolean;
}

export interface INotification {
  user: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string;
}

export interface IApprovalRequest {
  requester: string;
  type: string;
  status: ApprovalStatus;
  data: Record<string, unknown>;
  reviewer?: string;
  reviewComment?: string;
  reviewedAt?: Date;
  createdAt: Date;
}

export interface IMilestone {
  student: string;
  key: MilestoneKey;
  title: string;
  description: string;
  status: MilestoneStatus;
  order: number;
  dueDate?: Date;
  completedAt?: Date;
  updatedBy?: string;
}

export interface IAuditLog {
  user: string;
  action: string;
  entity: string;
  entityId: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  timestamp: Date;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    email: string;
  };
}

export enum ComprehensiveExamResult {
  SCHEDULED = 'scheduled',
  PASSED = 'passed',
  FAILED = 'failed',
}

export interface IComprehensiveExam {
  student: string;
  attemptNumber: number;
  examDate: Date;
  result: ComprehensiveExamResult;
  retakeDeadline?: Date;
  remarks?: string;
  conductedBy?: string;
  createdAt: Date;
}

export enum InternshipStatus {
  PENDING = 'pending',
  SUPERVISOR_APPROVED = 'supervisor_approved',
  ADMIN_APPROVED = 'admin_approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
}

export interface IInternship {
  student: string;
  organization: string;
  researchTopic: string;
  startDate: Date;
  endDate: Date;
  durationMonths: number;
  status: InternshipStatus;
  supervisorComment?: string;
  adminComment?: string;
  createdAt: Date;
}

export enum ExternalExaminerStatus {
  INVITED = 'invited',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  REPORT_SUBMITTED = 'report_submitted',
  OVERDUE_REPLACED = 'overdue_replaced',
}

export enum ExaminerCategory {
  CATEGORY_I = 'I',
  CATEGORY_II = 'II',
  CATEGORY_III = 'III',
}

export interface IExternalExaminer {
  thesis: string;
  student: string;
  examinerName: string;
  examinerEmail: string;
  institution: string;
  invitationDate: Date;
  responseDueDate: Date;
  status: ExternalExaminerStatus;
  category?: ExaminerCategory;
  cat3ResponseDueDate?: Date;
  reportUrl?: string;
  remarks?: string;
  createdAt: Date;
}

export type TimelineAlertSeverity = 'critical' | 'warning' | 'info';

export interface ITimelineAlert {
  code: string;
  title: string;
  message: string;
  severity: TimelineAlertSeverity;
  dueDate?: Date;
  daysDiff?: number;
  actionLink?: string;
}

export interface IRegistrationValidity {
  admissionDate: Date;
  expiryDate: Date;
  isExpired: boolean;
  daysRemaining: number;
  status: 'valid' | 'expiring_soon' | 'expired';
}

export interface ScholarDueItem {
  studentId: string;
  studentName: string;
  rollNumber: string;
  collegeId: string;
  department: string;
  supervisorName?: string;
  dueMilestone: string;
  dueDate?: string;
  daysDiff: number;
  status: 'overdue' | 'due_soon';
  action: string;
}

