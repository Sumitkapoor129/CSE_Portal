import mongoose from 'mongoose';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { Supervisor } from '../models/Supervisor';
import { FacultyProfile } from '../models/FacultyProfile';

export const resolveUserIds = async (ids: string[]): Promise<string[]> => {
  const filtered = ids.filter(Boolean);
  if (filtered.length === 0) return [];

  const users = await User.find({ _id: { $in: filtered } }).select('role').lean();
  const matchedUserIds = new Set<string>();
  const matchedAsUser = new Set<string>();

  for (const u of users) {
    if (u.role === 'student') {
      matchedUserIds.add(String(u._id));
      matchedAsUser.add(String(u._id));
    }
  }

  const remaining = filtered.filter(id => !matchedAsUser.has(id));
  if (remaining.length > 0) {
    const profiles = await StudentProfile.find({ _id: { $in: remaining } }).select('user').lean();
    for (const p of profiles) {
      if (p.user) {
        matchedUserIds.add(String(p.user));
      }
    }
  }

  return Array.from(matchedUserIds);
};

export const resolveParticipants = async (ids: string[]) => {
  const userIds = await resolveUserIds(ids);
  const participantDocs = userIds.map((participant) => ({
    participant,
    participantModel: 'User' as const,
  }));
  return { userIds, participantDocs };
};

export const getEligibleStudentOptions = async (supervisorUserId: string) => {
  let facultyProfile = await FacultyProfile.findOne({
    user: supervisorUserId,
  }).lean();
  if (!facultyProfile && mongoose.isValidObjectId(supervisorUserId)) {
    facultyProfile = await FacultyProfile.findById(supervisorUserId).lean();
  }

  const studentOptions: Array<{
    userId: string;
    profileId: string;
    name: string;
    rollNumber: string;
    department: string;
    studentType: string;
  }> = [];

  if (!facultyProfile) {
    return studentOptions;
  }

  const assignments = await Supervisor.find({
    $or: [
      { supervisor: facultyProfile._id },
      { coSupervisor: facultyProfile._id },
    ],
    isActive: true,
  })
    .select('student')
    .lean();

  const assignedStudentIds = assignments.map((a) => a.student);

  const profiles = await StudentProfile.find({
    $or: [
      { _id: { $in: assignedStudentIds } },
      { supervisor: facultyProfile._id },
      { coSupervisor: facultyProfile._id },
    ],
  })
    .populate('user', 'name email')
    .lean();

  const seenUsers = new Set<string>();
  for (const profile of profiles) {
    const user = profile.user as unknown as { _id: string; name?: string } | null;
    if (!user || !user._id) continue;
    const uid = String(user._id);
    if (seenUsers.has(uid)) continue;
    seenUsers.add(uid);

    studentOptions.push({
      userId: uid,
      profileId: String(profile._id),
      name: user.name || '',
      rollNumber: profile.rollNumber,
      department: profile.department,
      studentType: profile.studentType,
    });
  }

  return studentOptions;
};

export const getAssignedStudentUserIds = async (supervisorUserId: string): Promise<Set<string>> => {
  const options = await getEligibleStudentOptions(supervisorUserId);
  return new Set(options.map(o => o.userId));
};

export const parseEventDateTime = (dateVal: string | Date, timeVal: string | Date): Date => {
  if (timeVal instanceof Date && !isNaN(timeVal.getTime())) return timeVal;
  const timeStr = String(timeVal || '').trim();
  if (timeStr.includes('T')) {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) return d;
  }
  const dateBase = dateVal instanceof Date ? new Date(dateVal.getTime()) : new Date(dateVal);
  const match = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = match[3] ? parseInt(match[3], 10) : 0;
    dateBase.setHours(hours, minutes, seconds, 0);
    return dateBase;
  }
  const fallback = new Date(timeStr);
  return isNaN(fallback.getTime()) ? dateBase : fallback;
};

