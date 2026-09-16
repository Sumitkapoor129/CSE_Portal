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
  const facultyProfile = await FacultyProfile.findOne({
    user: new mongoose.Types.ObjectId(supervisorUserId),
  }).lean();

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
    supervisor: facultyProfile._id,
    isActive: true,
  })
    .select('student')
    .lean();

  for (const assignment of assignments) {
    const profile = await StudentProfile.findById(assignment.student)
      .populate('user', 'name email')
      .lean();

    if (!profile) continue;

    const user = profile.user as unknown as { _id: string; name?: string } | null;
    if (!user || !user._id) continue;

    studentOptions.push({
      userId: String(user._id),
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
