import mongoose from 'mongoose';
import { StudentProfile } from '../models/StudentProfile';
import { Milestone } from '../models/Milestone';
import { ComprehensiveExam } from '../models/ComprehensiveExam';
import { Thesis } from '../models/Thesis';
import { Internship } from '../models/Internship';
import { Supervisor } from '../models/Supervisor';
import {
  ComprehensiveExamResult,
  ITimelineAlert,
  IRegistrationValidity,
  MilestoneKey,
  MilestoneStatus,
  ScholarDueItem,
} from '../types';

export const DAY_MS = 86400000;

export interface StudentTimelineEvaluation {
  studentId: string;
  admissionDate: Date;
  validity: IRegistrationValidity;
  alerts: ITimelineAlert[];
  dues: ScholarDueItem[];
  comprehensiveExamSummary: {
    attemptsCount: number;
    hasPassed: boolean;
    latestResult?: ComprehensiveExamResult;
    retakeDeadline?: Date;
    canTakeSecondAttempt: boolean;
  };
}

export const evaluateStudentTimeline = async (
  studentProfileId: string
): Promise<StudentTimelineEvaluation | null> => {
  const profile = await StudentProfile.findById(studentProfileId)
    .populate('user', 'name email isActive')
    .lean();

  if (!profile) return null;

  const admissionDate = profile.admissionDate ? new Date(profile.admissionDate) : new Date((profile as any).createdAt || Date.now());
  const now = new Date();
  const nowTime = now.getTime();
  const admTime = admissionDate.getTime();

  // 8-Year validity calculation (2920 days)
  const expiryDate = new Date(admTime + 8 * 365 * DAY_MS);
  const daysRemaining = Math.ceil((expiryDate.getTime() - nowTime) / DAY_MS);
  const validityStatus: 'valid' | 'expiring_soon' | 'expired' =
    daysRemaining <= 0 ? 'expired' : daysRemaining <= 180 ? 'expiring_soon' : 'valid';

  const validity: IRegistrationValidity = {
    admissionDate,
    expiryDate,
    isExpired: daysRemaining <= 0,
    daysRemaining,
    status: validityStatus,
  };

  const [milestones, exams, theses] = await Promise.all([
    Milestone.find({ student: profile._id }).lean(),
    ComprehensiveExam.find({ student: profile._id }).sort({ attemptNumber: 1 }).lean(),
    Thesis.find({ student: profile._id }).sort({ submissionDate: -1 }).lean(),
  ]);

  const milestoneMap = new Map<string, any>();
  for (const m of milestones) {
    milestoneMap.set(m.key, m);
  }

  const alerts: ITimelineAlert[] = [];
  const dues: ScholarDueItem[] = [];

  const studentName = (profile.user as any)?.name || 'Scholar';
  const rollNumber = profile.rollNumber || '—';
  const collegeId = profile.collegeId || '—';
  const department = profile.department || '—';

  // Helper to add due item
  const addDue = (
    milestoneTitle: string,
    dueDate: Date,
    daysDiff: number,
    action: string,
    criticalMessage: string,
    warningMessage: string,
    code: string,
    actionLink: string
  ) => {
    const isOverdue = daysDiff < 0;
    const absDays = Math.abs(daysDiff);

    dues.push({
      studentId: profile._id.toString(),
      studentName,
      rollNumber,
      collegeId,
      department,
      dueMilestone: milestoneTitle,
      dueDate: dueDate.toISOString(),
      daysDiff,
      status: isOverdue ? 'overdue' : 'due_soon',
      action,
    });

    alerts.push({
      code,
      title: isOverdue ? `${milestoneTitle} Overdue` : `${milestoneTitle} Due Soon`,
      message: isOverdue ? criticalMessage : warningMessage,
      severity: isOverdue ? 'critical' : 'warning',
      dueDate,
      daysDiff,
      actionLink,
    });
  };

  // 1. SRC Formation (Due within 14 days of admission)
  const srcMilestone = milestoneMap.get(MilestoneKey.SRC_FORMED);
  const srcDue = new Date(admTime + 14 * DAY_MS);
  if (!srcMilestone || srcMilestone.status !== MilestoneStatus.COMPLETED) {
    const daysDiff = Math.ceil((srcDue.getTime() - nowTime) / DAY_MS);
    if (daysDiff < 0) {
      addDue(
        'SRC Formation',
        srcDue,
        daysDiff,
        'Form SRC Committee',
        `SRC formation is overdue by ${Math.abs(daysDiff)} days (ordinance requires SRC formation within 2 weeks of joining).`,
        `SRC formation is due in ${daysDiff} days.`,
        'SRC_OVERDUE',
        '/admin/src-committee'
      );
    } else if (daysDiff <= 7) {
      addDue(
        'SRC Formation',
        srcDue,
        daysDiff,
        'Form SRC Committee',
        '',
        `SRC formation is due in ${daysDiff} days (must be formed within 2 weeks of joining).`,
        'SRC_DUE_SOON',
        '/admin/src-committee'
      );
    }
  }

  // 2. Coursework Completion (Must be completed within 2 years of enrollment)
  const cwMilestone = milestoneMap.get(MilestoneKey.COURSE_WORK);
  const cwDue = new Date(admTime + 730 * DAY_MS);
  if (!cwMilestone || cwMilestone.status !== MilestoneStatus.COMPLETED) {
    const daysDiff = Math.ceil((cwDue.getTime() - nowTime) / DAY_MS);
    if (daysDiff < 0) {
      addDue(
        'Coursework Completion',
        cwDue,
        daysDiff,
        'Complete Coursework',
        `Coursework is overdue by ${Math.abs(daysDiff)} days (ordinance requires completion within 2 years of enrollment).`,
        `Coursework must be completed within ${daysDiff} days.`,
        'COURSEWORK_OVERDUE',
        '/student/courses'
      );
    } else if (daysDiff <= 60) {
      addDue(
        'Coursework Completion',
        cwDue,
        daysDiff,
        'Complete Coursework',
        '',
        `Coursework completion deadline is approaching in ${daysDiff} days (2-year limit).`,
        'COURSEWORK_DUE_SOON',
        '/student/courses'
      );
    }
  }

  // 3. Comprehensive Examination & 3-month retake tracker
  const compMilestone = milestoneMap.get(MilestoneKey.COMPREHENSIVE_EXAM);
  const attempt1 = exams.find((e) => e.attemptNumber === 1);
  const attempt2 = exams.find((e) => e.attemptNumber === 2);
  const hasPassedExam = exams.some((e) => e.result === ComprehensiveExamResult.PASSED);

  if (!hasPassedExam) {
    if (attempt1 && attempt1.result === ComprehensiveExamResult.FAILED) {
      // Retake deadline: 3 months from attempt 1 (90 days)
      const retakeDue = attempt1.retakeDeadline || new Date(new Date(attempt1.examDate).getTime() + 90 * DAY_MS);
      const daysDiff = Math.ceil((new Date(retakeDue).getTime() - nowTime) / DAY_MS);

      if (!attempt2) {
        if (daysDiff < 0) {
          addDue(
            'Second Comprehensive Exam',
            new Date(retakeDue),
            daysDiff,
            'Schedule 2nd Comprehensive Exam',
            `Second Comprehensive Exam is OVERDUE by ${Math.abs(daysDiff)} days (must reappear within 3 months of first attempt).`,
            `Second Comprehensive Exam must be held in ${daysDiff} days.`,
            'COMP_RETAKE_OVERDUE',
            '/supervisor/events'
          );
        } else {
          addDue(
            'Second Comprehensive Exam',
            new Date(retakeDue),
            daysDiff,
            'Schedule 2nd Comprehensive Exam',
            '',
            `Second Comprehensive Exam is due in ${daysDiff} days (ordinance requires retake within 3 months).`,
            'COMP_RETAKE_DUE_SOON',
            '/supervisor/events'
          );
        }
      } else if (attempt2.result === ComprehensiveExamResult.FAILED) {
        alerts.push({
          code: 'COMP_MAX_ATTEMPTS_EXHAUSTED',
          title: 'Comprehensive Exam Failed',
          message: 'Both comprehensive exam attempts were unsatisfactory. Refer to Senate ordinance guidelines.',
          severity: 'critical',
          actionLink: '/student/milestones',
        });
      }
    }
  }

  // 4. Topic Registration Seminar (Within 6 months after passing Comprehensive Exam, or 2 years of enrollment)
  const topicMilestone = milestoneMap.get(MilestoneKey.TOPIC_REGISTRATION);
  if (!topicMilestone || topicMilestone.status !== MilestoneStatus.COMPLETED) {
    if (hasPassedExam) {
      const passedExamDoc = exams.find((e) => e.result === ComprehensiveExamResult.PASSED);
      const examDate = passedExamDoc?.examDate ? new Date(passedExamDoc.examDate) : now;
      const topicDue = new Date(examDate.getTime() + 180 * DAY_MS); // 6 months
      const daysDiff = Math.ceil((topicDue.getTime() - nowTime) / DAY_MS);

      if (daysDiff < 0) {
        addDue(
          'Topic Registration Seminar',
          topicDue,
          daysDiff,
          'Conduct Topic Registration',
          `Topic Registration is OVERDUE by ${Math.abs(daysDiff)} days (ordinance requires within 6 months of passing Comprehensive Exam).`,
          `Topic Registration due in ${daysDiff} days.`,
          'TOPIC_REG_OVERDUE',
          '/supervisor/events'
        );
      } else if (daysDiff <= 30) {
        addDue(
          'Topic Registration Seminar',
          topicDue,
          daysDiff,
          'Conduct Topic Registration',
          '',
          `Topic Registration due in ${daysDiff} days (within 6 months of passing Comprehensive Exam).`,
          'TOPIC_REG_DUE_SOON',
          '/supervisor/events'
        );
      }
    } else {
      // General 2-year deadline from admission
      const topicNormDue = new Date(admTime + 730 * DAY_MS);
      const daysDiff = Math.ceil((topicNormDue.getTime() - nowTime) / DAY_MS);
      if (daysDiff < 0) {
        alerts.push({
          code: 'TOPIC_REG_NORM_OVERDUE',
          title: 'Topic Registration Past Normal Period',
          message: `Normally topic registration should be completed within 2 calendar years of enrollment (exceeded by ${Math.abs(daysDiff)} days).`,
          severity: 'warning',
          dueDate: topicNormDue,
          daysDiff,
          actionLink: '/student/milestones',
        });
      }
    }
  }

  // 5. Stipend Enhancement Seminar (After 24 months / 2 years from admission)
  const enhanceMilestone = milestoneMap.get(MilestoneKey.ENHANCEMENT_SEMINAR);
  const enhanceDue = new Date(admTime + 730 * DAY_MS);
  if (!enhanceMilestone || enhanceMilestone.status !== MilestoneStatus.COMPLETED) {
    if (nowTime >= enhanceDue.getTime()) {
      alerts.push({
        code: 'ENHANCEMENT_SEMINAR_ELIGIBLE',
        title: 'Stipend Enhancement Seminar Due',
        message: 'Scholar has completed 24 months of PhD enrollment and is eligible for Stipend Enhancement Seminar.',
        severity: 'info',
        dueDate: enhanceDue,
        actionLink: '/student/milestones',
      });
    }
  }

  // 6. Extension Seminar (After 48 months / 4 years if research incomplete)
  const extMilestone = milestoneMap.get(MilestoneKey.EXTENSION_SEMINAR);
  const extDue = new Date(admTime + 1460 * DAY_MS);
  const thesisSubmitted = theses.some((t) => t.status !== 'draft');
  if (!thesisSubmitted && (!extMilestone || extMilestone.status !== MilestoneStatus.COMPLETED)) {
    if (nowTime >= extDue.getTime()) {
      const daysDiff = Math.ceil((extDue.getTime() - nowTime) / DAY_MS);
      addDue(
        '4th Year Extension Seminar',
        extDue,
        daysDiff,
        'Present Extension Seminar',
        `Scholar has completed 4 years of PhD enrollment without thesis submission. Extension seminar is required.`,
        'Extension seminar required after 4 years.',
        'EXTENSION_SEMINAR_DUE',
        '/supervisor/events'
      );
    }
  }

  // 7. Pre-Submission to Thesis Submission (Within 2 months / 60 days)
  const preSubMilestone = milestoneMap.get(MilestoneKey.PRE_SUBMISSION);
  const thesisMilestone = milestoneMap.get(MilestoneKey.THESIS_SUBMITTED);
  if (
    preSubMilestone &&
    preSubMilestone.status === MilestoneStatus.COMPLETED &&
    (!thesisMilestone || thesisMilestone.status !== MilestoneStatus.COMPLETED)
  ) {
    const preSubCompletedAt = preSubMilestone.completedAt ? new Date(preSubMilestone.completedAt) : now;
    const submissionDue = new Date(preSubCompletedAt.getTime() + 60 * DAY_MS);
    const daysDiff = Math.ceil((submissionDue.getTime() - nowTime) / DAY_MS);

    if (daysDiff < 0) {
      addDue(
        'Thesis Submission',
        submissionDue,
        daysDiff,
        'Submit Final Thesis',
        `Thesis submission is OVERDUE by ${Math.abs(daysDiff)} days (ordinance requires submission within 2 months of Pre-Submission seminar).`,
        `Thesis submission due in ${daysDiff} days.`,
        'THESIS_SUBMISSION_OVERDUE',
        '/student/thesis'
      );
    } else {
      addDue(
        'Thesis Submission',
        submissionDue,
        daysDiff,
        'Submit Final Thesis',
        '',
        `Thesis submission is due in ${daysDiff} days (within 2 months of Pre-Submission seminar).`,
        'THESIS_SUBMISSION_DUE_SOON',
        '/student/thesis'
      );
    }
  }

  // 8. Registration Validity Alerts
  if (validityStatus === 'expired') {
    alerts.unshift({
      code: 'REGISTRATION_EXPIRED',
      title: 'Registration Validity Expired',
      message: `PhD registration validity has expired (normally 8 years from enrollment). Exceeded on ${expiryDate.toLocaleDateString()}.`,
      severity: 'critical',
      dueDate: expiryDate,
      actionLink: '/student/profile',
    });
  } else if (validityStatus === 'expiring_soon') {
    alerts.push({
      code: 'REGISTRATION_EXPIRING_SOON',
      title: 'Registration Validity Expiring Soon',
      message: `PhD registration validity expires in ${daysRemaining} days (8-year limit on ${expiryDate.toLocaleDateString()}).`,
      severity: 'warning',
      dueDate: expiryDate,
      daysDiff: daysRemaining,
      actionLink: '/student/profile',
    });
  }

  return {
    studentId: profile._id.toString(),
    admissionDate,
    validity,
    alerts,
    dues,
    comprehensiveExamSummary: {
      attemptsCount: exams.length,
      hasPassed: hasPassedExam,
      latestResult: exams[exams.length - 1]?.result,
      retakeDeadline: attempt1?.retakeDeadline,
      canTakeSecondAttempt: !hasPassedExam && exams.length < 2,
    },
  };
};

export const getSupervisorScholarsDues = async (
  facultyProfileId: string
): Promise<{ dues: ScholarDueItem[]; criticalCount: number; warningCount: number }> => {
  const supervisorRecords = await Supervisor.find({
    $or: [{ supervisor: facultyProfileId }, { coSupervisor: facultyProfileId }],
    isActive: true,
  }).select('student').lean();

  const studentIds = supervisorRecords.map((s) => s.student);
  const directProfiles = await StudentProfile.find({
    $or: [
      { _id: { $in: studentIds } },
      { supervisor: facultyProfileId },
      { coSupervisor: facultyProfileId },
    ],
  }).select('_id').lean();

  const allDues: ScholarDueItem[] = [];
  let criticalCount = 0;
  let warningCount = 0;

  for (const p of directProfiles) {
    const evaluation = await evaluateStudentTimeline(p._id.toString());
    if (evaluation && evaluation.dues.length > 0) {
      for (const due of evaluation.dues) {
        allDues.push(due);
        if (due.status === 'overdue') criticalCount += 1;
        else warningCount += 1;
      }
    }
  }

  allDues.sort((a, b) => a.daysDiff - b.daysDiff);

  return { dues: allDues, criticalCount, warningCount };
};

export const getAdminDepartmentDues = async (): Promise<{
  dues: ScholarDueItem[];
  overdueCount: number;
  dueSoonCount: number;
  expiringRegistrationCount: number;
}> => {
  const profiles = await StudentProfile.find({}).select('_id').lean();

  const allDues: ScholarDueItem[] = [];
  let overdueCount = 0;
  let dueSoonCount = 0;
  let expiringRegistrationCount = 0;

  for (const p of profiles) {
    const evaluation = await evaluateStudentTimeline(p._id.toString());
    if (evaluation) {
      if (evaluation.validity.status !== 'valid') {
        expiringRegistrationCount += 1;
      }
      for (const due of evaluation.dues) {
        allDues.push(due);
        if (due.status === 'overdue') overdueCount += 1;
        else dueSoonCount += 1;
      }
    }
  }

  allDues.sort((a, b) => a.daysDiff - b.daysDiff);

  return {
    dues: allDues,
    overdueCount,
    dueSoonCount,
    expiringRegistrationCount,
  };
};
