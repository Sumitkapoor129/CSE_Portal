import { Milestone } from '../models/Milestone';
import { StudentProfile } from '../models/StudentProfile';
import { Notification } from '../models/Notification';
import { MilestoneReminderLevel } from '../types';

const DAY_MS = 86400000;

export const REMINDER_LEVELS: MilestoneReminderLevel[] = ['15', '7', '3', '1', '0', 'overdue'];

export const computeDaysRemaining = (dueDate: Date): number => {
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const due = Date.UTC(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  return Math.round((due - today) / DAY_MS);
};

export const levelForDays = (days: number): MilestoneReminderLevel | null => {
  if (days < 0) return 'overdue';
  if (days === 0) return '0';
  if (days === 1) return '1';
  if (days >= 2 && days <= 3) return '3';
  if (days >= 4 && days <= 7) return '7';
  if (days >= 8 && days <= 15) return '15';
  return null;
};

export const severityForLevel = (level: MilestoneReminderLevel): 'info' | 'warning' | 'critical' => {
  switch (level) {
    case '15':
      return 'info';
    case '7':
      return 'warning';
    default:
      return 'critical';
  }
};

export const titleForMilestone = (level: MilestoneReminderLevel, milestone: any): string => {
  const title = milestone?.title || 'Milestone';
  switch (level) {
    case 'overdue':
      return `${title} \u2014 Overdue`;
    case '0':
      return `${title} \u2014 Due Today`;
    case '1':
      return `${title} \u2014 Due Tomorrow`;
    case '3':
      return `${title} \u2014 Urgent`;
    case '7':
      return `${title} \u2014 Due Soon`;
    case '15':
      return `${title} \u2014 Upcoming`;
  }
};

export const messageForMilestone = (
  level: MilestoneReminderLevel,
  milestone: any,
  dueDateStr: string
): string => {
  if (level === 'overdue') {
    return `This milestone is overdue. Target was ${dueDateStr}.`;
  }
  if (level === '0') {
    return 'This milestone is due today.';
  }
  const days = milestone?.dueDate ? computeDaysRemaining(new Date(milestone.dueDate)) : 0;
  return `This milestone is due in ${days} day${days === 1 ? '' : 's'} on ${dueDateStr}.`;
};

const formatDate = (d: Date | string): string => {
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

interface ReminderNotificationData {
  userId: string;
  milestone: any;
  level: MilestoneReminderLevel;
  days: number;
}

const buildReminderNotification = (params: ReminderNotificationData): Record<string, unknown> => {
  const dueDateStr = formatDate(params.milestone.dueDate);
  return {
    user: params.userId,
    title: titleForMilestone(params.level, params.milestone),
    message: messageForMilestone(params.level, params.milestone, dueDateStr),
    type: 'milestone_reminder',
    link: '/student/milestones',
    milestone: params.milestone._id,
    dueDate: params.milestone.dueDate,
    daysRemaining: params.days,
    severity: severityForLevel(params.level),
  };
};

// Atomically reserves the reminder level on the milestone doc so two interleaved
// runs can never both pass the `includes(level)` check and create a duplicate.
const claimReminderLevel = async (milestoneId: any, level: MilestoneReminderLevel): Promise<boolean> => {
  const claim = await Milestone.updateOne(
    { _id: milestoneId, reminderLevels: { $ne: level } },
    { $push: { reminderLevels: level } }
  );
  return claim.modifiedCount === 1;
};

const needsLevel = (milestone: any, level: MilestoneReminderLevel): boolean =>
  !(milestone.reminderLevels || []).includes(level);

export const generateMilestoneReminders = async (
  options?: { log?: boolean }
): Promise<{ checked: number; created: number } | { error: string }> => {
  let checked = 0;
  let created = 0;
  try {
    const milestones = await Milestone.find({
      status: { $in: ['pending', 'in_progress'] },
      dueDate: { $ne: null },
    }).lean();

    const toClaim: Array<{ milestone: any; level: MilestoneReminderLevel; days: number }> = [];
    for (const milestone of milestones) {
      checked += 1;
      if (!milestone.dueDate) continue;
      const days = computeDaysRemaining(new Date(milestone.dueDate));
      const level = levelForDays(days);
      if (!level) continue;
      if (!needsLevel(milestone, level)) continue;
      toClaim.push({ milestone, level, days });
    }

    if (toClaim.length === 0) {
      return { checked, created };
    }

    // Single query for all student profiles instead of one per milestone.
    const studentIds = Array.from(new Set(toClaim.map((c) => String(c.milestone.student))));
    const profiles = await StudentProfile.find({ _id: { $in: studentIds } })
      .select('user')
      .lean();
    const userByStudentId = new Map<string, string>();
    for (const profile of profiles) {
      if (profile?.user) {
        userByStudentId.set(String(profile._id), String(profile.user));
      }
    }

    const toInsert: Record<string, unknown>[] = [];
    for (const item of toClaim) {
      const userId = userByStudentId.get(String(item.milestone.student));
      if (!userId) continue;
      try {
        const won = await claimReminderLevel(item.milestone._id, item.level);
        if (won) {
          toInsert.push(
            buildReminderNotification({
              userId,
              milestone: item.milestone,
              level: item.level,
              days: item.days,
            })
          );
          created += 1;
        }
      } catch (err) {
        if (options?.log) console.error('generateMilestoneReminders claim error', err);
      }
    }

    if (toInsert.length > 0) {
      await Notification.insertMany(toInsert);
    }

    return { checked, created };
  } catch (err) {
    if (options?.log) console.error('generateMilestoneReminders error', err);
    return { error: String(err) };
  }
};

export const ensureMilestoneRemindersForStudent = async (profileId: string, userId: string): Promise<void> => {
  const milestones = await Milestone.find({
    student: profileId,
    status: { $in: ['pending', 'in_progress'] },
    dueDate: { $ne: null },
  }).lean();

  const toInsert: Record<string, unknown>[] = [];
  for (const milestone of milestones) {
    if (!milestone.dueDate) continue;
    const days = computeDaysRemaining(new Date(milestone.dueDate));
    const level = levelForDays(days);
    if (!level) continue;
    if (!needsLevel(milestone, level)) continue;
    try {
      const won = await claimReminderLevel(milestone._id, level);
      if (won) {
        toInsert.push(buildReminderNotification({ userId, milestone, level, days }));
      }
    } catch (err) {
      void err;
    }
  }

  if (toInsert.length > 0) {
    await Notification.insertMany(toInsert);
  }
};

export const pickCurrentReminderLevel = (milestone: any): MilestoneReminderLevel | null => {
  const levels: string[] = milestone?.reminderLevels || [];
  for (let i = REMINDER_LEVELS.length - 1; i >= 0; i--) {
    if (levels.includes(REMINDER_LEVELS[i])) {
      return REMINDER_LEVELS[i];
    }
  }
  return null;
};

export const checkMilestoneReminders = generateMilestoneReminders;