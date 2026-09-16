import mongoose from 'mongoose';
import { Deadline } from '../models/Deadline';
import { Semester } from '../models/Semester';
import { StudentProfile } from '../models/StudentProfile';
import { User } from '../models/User';
import { createBulkNotifications } from '../utils/notify';
import { sendNotificationEmail } from '../utils/email';

export const DAY_MS = 86400000;

interface DatedDeadline {
  _id: mongoose.Types.ObjectId | string;
  title: string;
  description?: string;
  dueDate: Date;
  semester?: number;
  student?: string;
  createdBy: string;
  notificationSent: boolean;
}

const formatDate = (d: Date): string => {
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const checkDeadlines = async ({
  daysAhead = 7,
  log = false,
}: { daysAhead?: number; log?: boolean } = {}) => {
  let checked = 0;
  let notif = 0;
  let emails = 0;

  try {
    const now = Date.now();
    const horizon = now + daysAhead * DAY_MS;

    const deadlines = await Deadline.find({
      notificationSent: false,
      dueDate: { $gte: new Date(now), $lte: new Date(horizon) },
    }).lean<DatedDeadline[]>();

    for (const deadline of deadlines) {
      checked += 1;

      let profileIds: string[] = [];

      if (deadline.student) {
        profileIds = [deadline.student];
      } else if (deadline.semester != null) {
        const semesters = await Semester.find({ semesterNumber: deadline.semester }).select('student').lean();
        profileIds = semesters.map((s: any) => String(s.student));
      } else {
        const profiles = await StudentProfile.find({}).select('_id').lean();
        profileIds = profiles.map((p: any) => String(p._id));
      }

      if (profileIds.length === 0) continue;

      const profileDocs = await StudentProfile.find({ _id: { $in: profileIds } }).select('user').lean();
      const userIds = [...new Set(profileDocs.filter((p: any) => p.user).map((p: any) => String(p.user)))];

      if (userIds.length === 0) continue;

      const message = `"${deadline.title}" is due on ${formatDate(deadline.dueDate)}. Please complete it before the deadline.`;
      const title = 'Upcoming Deadline: ' + deadline.title;

      await createBulkNotifications(userIds, { title, message, type: 'deadline', link: '/student/deadlines' });
      notif += userIds.length;

      const userDocs = await User.find({ _id: { $in: userIds } }).select('email').lean();
      const emailResults = await Promise.allSettled(
        userDocs.map((u: any) => sendNotificationEmail(u.email, title, message))
      );
      emails += emailResults.filter((r) => r.status === 'fulfilled').length;

      await Deadline.updateOne({ _id: deadline._id }, { $set: { notificationSent: true } });
    }

    return { checked, notif, emails };
  } catch (err) {
    if (log) console.error('checkDeadlines error', err);
    return { error: String(err) };
  }
};
