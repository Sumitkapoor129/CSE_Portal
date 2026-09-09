import mongoose from 'mongoose';
import { User } from '../models/User';
import { StudentProfile } from '../models/StudentProfile';
import { Supervisor } from '../models/Supervisor';
import { FacultyProfile } from '../models/FacultyProfile';

export const resolveUserIds = async (ids: string[]): Promise<string[]> => {
  const resolved = new Set<string>();

  for (const id of ids) {
    if (!id) continue;
    try {
      const user = await User.findById(id).select('role').lean();
      if (user && user.role === 'student') {
        resolved.add(String(user._id));
        continue;
      }

      const profile = await StudentProfile.findById(id).select('user').lean().catch(() => null);
      if (profile && profile.user) {
        resolved.add(String(profile.user));
      }
    } catch (err) {
      continue;
    }
  }

  return Array.from(resolved);
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
