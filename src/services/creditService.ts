import mongoose from 'mongoose';
import { StudentCourse } from '../models/StudentCourse';

interface CreditResult {
  earned: number;
  required: number;
  remaining: number;
}

export const computeCreditsForSemester = async (
  studentId: string,
  semesterId: string,
  requiredCredits: number
): Promise<CreditResult> => {
  const result = await StudentCourse.aggregate([
    {
      $match: {
        student: new mongoose.Types.ObjectId(studentId),
        semester: new mongoose.Types.ObjectId(semesterId),
        status: 'approved',
      },
    },
    { $lookup: { from: 'courses', localField: 'course', foreignField: '_id', as: 'courseInfo' } },
    { $unwind: '$courseInfo' },
    { $group: { _id: null, earned: { $sum: '$courseInfo.credits' } } },
  ]);

  const earned = result.length > 0 ? result[0].earned : 0;
  const required = requiredCredits;
  return { earned, required, remaining: Math.max(0, required - earned) };
};

export const computeTotalCredits = async (
  studentId: string,
  requiredCredits: number
): Promise<CreditResult> => {
  const result = await StudentCourse.aggregate([
    {
      $match: {
        student: new mongoose.Types.ObjectId(studentId),
        status: 'approved',
      },
    },
    { $lookup: { from: 'courses', localField: 'course', foreignField: '_id', as: 'courseInfo' } },
    { $unwind: '$courseInfo' },
    { $group: { _id: null, earned: { $sum: '$courseInfo.credits' } } },
  ]);

  const earned = result.length > 0 ? result[0].earned : 0;
  const required = requiredCredits;
  return { earned, required, remaining: Math.max(0, required - earned) };
};
