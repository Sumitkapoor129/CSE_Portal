import mongoose from 'mongoose';
import { Deadline } from '../models/Deadline';
import { Semester } from '../models/Semester';
import { StudentProfile } from '../models/StudentProfile';
import { User } from '../models/User';
import { createNotification } from '../utils/notify';
import { sendNotificationEmail } from '../utils/email';

export const DAY_MS = 86400000;

interface DatedDeadline {
  _id: mongoose.Types.ObjectId | string;
  title: string;
  description?: string;
  dueDate: Date;
  semester?: string;
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

      let targetStack: Array<{ _id: unknown; user?: unknown }> = [];
      if (deadline.student) {
        targetStack = [{ _id: deadline.student, user: undefined }];
      } else if (deadline.semester) {
        const semesters = await Semester.find({ semester: deadline.semester }).lean();
        targetStack = semesters.map((s: any) => ({ _id: s.student, user: undefined }));
      } else {
        const profiles = await StudentProfile.find({}).select('_id user').lean();
        targetStack = profiles.map((p: any) => ({ _id: p._id, user: p.user }));
      }

      const userIds = new Set<string>();
      for (const t of targetStack) {
        if (!t._id) continue;
        if (t.user) {
          userIds.add(String(t.user));
          continue;
        }
        const profile = await StudentProfile.findById(t._id).select('user').lean().catch(() => null);
        if (profile && profile.user) {
          userIds.add(String(profile.user));
        }
      }

      const message = `"${deadline.title}" is due on ${formatDate(deadline.dueDate)}. Please complete it before the deadline.`;
      const title = 'Upcoming Deadline: ' + deadline.title;

      for (const userId of userIds) {
        try {
          await createNotification({ user: userId, title, message, type: 'deadline', link: '/student/deadlines' });
          notif += 1;
        } catch (err) {
          if (log) console.error('Deadline notification create failed', userId, err);
        }

        try {
          const userDoc = await User.findById(userId).select('email').lean();
          if (userDoc && userDoc.email) {
            await sendNotificationEmail(userDoc.email, title, message);
            emails += 1;
          }
        } catch (err) {
          if (log) console.error('Deadline email failed', userId, err);
        }
      }

      await Deadline.updateOne({ _id: deadline._id }, { $set: { notificationSent: true } });
    }

    return { checked, notif, emails };
  } catch (err) {
    if (log) console.error('checkDeadlines error', err);
    return { error: String(err) };
  }
};
