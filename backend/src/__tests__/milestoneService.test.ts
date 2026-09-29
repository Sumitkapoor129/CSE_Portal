import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  seedMilestones,
  getMilestones,
  updateMilestone,
  calculateMilestoneDueDate,
  DEFAULT_MILESTONES,
  parseDateOnly,
  applyAdmissionDate,
  derivePreSubmissionDependencies,
  backfillMilestoneMetadata,
} from '../services/milestoneService';
import { Milestone } from '../models/Milestone';
import { MilestoneKey, MilestoneStatus } from '../types';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

const STUDENT_ID = new mongoose.Types.ObjectId().toString();

describe('milestoneService', () => {
  describe('seedMilestones', () => {
    it('should create 11 milestones for a student', async () => {
      await seedMilestones(STUDENT_ID);
      const count = await Milestone.countDocuments({ student: STUDENT_ID });
      expect(count).toBe(DEFAULT_MILESTONES.length);
    });

    it('should not duplicate milestones on re-seed (catches 11000)', async () => {
      await seedMilestones(STUDENT_ID);
      const count = await Milestone.countDocuments({ student: STUDENT_ID });
      expect(count).toBe(DEFAULT_MILESTONES.length);
    });

    it('should include regulation, priority, dateSource and reminderLevels', async () => {
      const milestones = await Milestone.find({ student: STUDENT_ID }).lean();
      expect(milestones.length).toBe(DEFAULT_MILESTONES.length);
      for (const m of milestones) {
        expect(m.regulation).toBeDefined();
        expect(m.priority).toBeDefined();
        expect(m.dateSource).toBeDefined();
      }
      const courseWork = milestones.find((m) => m.key === MilestoneKey.COURSE_WORK);
      expect(courseWork!.dateSource).toBe('auto');
      expect(courseWork!.priority).toBe('critical');
      const comprehensive = milestones.find((m) => m.key === MilestoneKey.COMPREHENSIVE_EXAM);
      expect(comprehensive!.dateSource).toBe('manual');
      expect(comprehensive!.dueDate).toBeUndefined();
    });
  });

  describe('getMilestones', () => {
    it('should return milestones sorted by order', async () => {
      const milestones = await getMilestones(STUDENT_ID);
      expect(milestones.length).toBe(DEFAULT_MILESTONES.length);

      const orders = milestones.map((m: any) => m.order);
      const sorted = [...orders].sort((a, b) => a - b);
      expect(orders).toEqual(sorted);

      milestones.forEach((m: any, i: number) => {
        expect(m.order).toBe(i);
        if (i === 0) {
          expect(m.status).toBe(MilestoneStatus.COMPLETED);
        } else {
          expect(m.status).toBe(MilestoneStatus.PENDING);
        }
      });
    });
  });

  describe('updateMilestone', () => {
    it('should set completedAt when status is completed', async () => {
      const milestones = await getMilestones(STUDENT_ID);
      const id = milestones[0]._id.toString();
      const userId = new mongoose.Types.ObjectId().toString();

      const updated = await updateMilestone(id, userId, {
        status: MilestoneStatus.COMPLETED,
      });

      expect(updated.status).toBe(MilestoneStatus.COMPLETED);
      expect(updated.completedAt).toBeDefined();
      expect(updated.completedAt).toBeInstanceOf(Date);
      expect(updated.updatedBy!.toString()).toBe(userId);
    });

    it('should clear completedAt when status changes away from completed', async () => {
      const milestones = await getMilestones(STUDENT_ID);
      const id = milestones[0]._id.toString();
      const userId = new mongoose.Types.ObjectId().toString();

      const updated = await updateMilestone(id, userId, {
        status: MilestoneStatus.IN_PROGRESS,
      });

      expect(updated.status).toBe(MilestoneStatus.IN_PROGRESS);
      expect(updated.completedAt).toBeUndefined();
    });

    it('should throw on invalid status', async () => {
      const milestones = await getMilestones(STUDENT_ID);
      const id = milestones[1]._id.toString();
      const userId = new mongoose.Types.ObjectId().toString();

      await expect(
        updateMilestone(id, userId, { status: 'bogus_status' })
      ).rejects.toThrow('Invalid status');
    });

    it('should throw when milestone id is unknown', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const userId = new mongoose.Types.ObjectId().toString();

      await expect(
        updateMilestone(fakeId, userId, { status: MilestoneStatus.COMPLETED })
      ).rejects.toThrow('Milestone not found');
    });

    it('flips dateSource to manual when an auto milestone dueDate is overridden', async () => {
      const sid = new mongoose.Types.ObjectId().toString();
      await seedMilestones(sid);

      const courseWork = await Milestone.findOne({ student: sid, key: MilestoneKey.COURSE_WORK });
      expect(courseWork!.dateSource).toBe('auto');

      const userId = new mongoose.Types.ObjectId().toString();
      await updateMilestone(courseWork!._id.toString(), userId, { dueDate: new Date(2027, 0, 1) });

      const after = await Milestone.findById(courseWork!._id);
      expect(after!.dateSource).toBe('manual');
      expect(after!.reminderLevels).toEqual([]);
      expect(after!.dueDate!.getFullYear()).toBe(2027);
    });
  });

  describe('calculateMilestoneDueDate', () => {
    it('should use calendar years (not fixed 365-day math) for course work', () => {
      const base = new Date(2024, 1, 29); // Feb 29 2024
      const due = calculateMilestoneDueDate(MilestoneKey.COURSE_WORK, base);
      expect(due).toBeDefined();
      expect(due!.getFullYear()).toBe(base.getFullYear() + 2);
      expect(due!.getMonth()).toBe(1);
      // Feb 29 2024 + 2y => Feb 28 2026 (clamped) or Mar 1 2026 (rolled over)
      expect([28, 29, 0]).toContain(due!.getDate());
    });

    it('should return undefined for manual/TBD milestones', () => {
      expect(calculateMilestoneDueDate(MilestoneKey.COMPREHENSIVE_EXAM, new Date())).toBeUndefined();
      expect(calculateMilestoneDueDate(MilestoneKey.THESIS_SUBMITTED, new Date())).toBeUndefined();
      expect(calculateMilestoneDueDate(MilestoneKey.THESIS_APPROVED, new Date())).toBeUndefined();
      expect(calculateMilestoneDueDate(MilestoneKey.DEFENSE, new Date())).toBeUndefined();
      expect(calculateMilestoneDueDate(MilestoneKey.DEGREE_AWARDED, new Date())).toBeUndefined();
    });

    it('should compute SRC formation as admission + 14 days', () => {
      const base = new Date(2024, 0, 1);
      const due = calculateMilestoneDueDate(MilestoneKey.SRC_FORMED, base)!;
      expect(due.getDate()).toBe(15);
    });

    it('should compute pre-submission as admission + 2.5 calendar years', () => {
      const base = new Date(2024, 0, 15);
      const due = calculateMilestoneDueDate(MilestoneKey.PRE_SUBMISSION, base)!;
      expect(due.getFullYear()).toBe(2026);
      expect(due.getMonth()).toBe(6); // July
      expect(due.getDate()).toBe(15);
    });
  });

  describe('parseDateOnly', () => {
    it('parses YYYY-MM-DD into a LOCAL-midnight Date', () => {
      const parsed = parseDateOnly('2024-03-15');
      expect(isNaN(parsed.getTime())).toBe(false);
      expect(parsed.getFullYear()).toBe(2024);
      expect(parsed.getMonth()).toBe(2);
      expect(parsed.getDate()).toBe(15);
      expect(parsed.getHours()).toBe(0);
    });

    it('rejects garbage and impossible calendar dates', () => {
      expect(isNaN(parseDateOnly('garbage').getTime())).toBe(true);
      expect(isNaN(parseDateOnly('2024-13-01').getTime())).toBe(true);
      expect(isNaN(parseDateOnly('2024-02-31').getTime())).toBe(true);
      expect(isNaN(parseDateOnly('15/03/2024').getTime())).toBe(true);
      expect(isNaN(parseDateOnly('').getTime())).toBe(true);
    });
  });

  describe('applyAdmissionDate', () => {
    it('recalculates auto dates, clears reminderLevels, and skips manual overrides', async () => {
      const sid = new mongoose.Types.ObjectId().toString();
      await seedMilestones(sid);

      const courseWork = await Milestone.findOne({ student: sid, key: MilestoneKey.COURSE_WORK });
      courseWork!.reminderLevels = ['15', '7'];
      await courseWork!.save();

      const comprehensive = await Milestone.findOne({ student: sid, key: MilestoneKey.COMPREHENSIVE_EXAM });
      comprehensive!.dueDate = new Date(2030, 0, 1);
      comprehensive!.reminderLevels = ['15'];
      await comprehensive!.save();

      await applyAdmissionDate(sid, new Date(2025, 5, 1));

      const cwAfter = await Milestone.findOne({ student: sid, key: MilestoneKey.COURSE_WORK });
      expect(cwAfter!.reminderLevels).toEqual([]);
      expect(cwAfter!.dateSource).toBe('auto');
      expect(cwAfter!.dueDate!.getFullYear()).toBe(2027); // admission + 2 years
      expect(cwAfter!.dueDate!.getMonth()).toBe(5);
      expect(cwAfter!.dueDate!.getDate()).toBe(1);

      const compAfter = await Milestone.findOne({ student: sid, key: MilestoneKey.COMPREHENSIVE_EXAM });
      expect(compAfter!.dueDate!.getFullYear()).toBe(2030); // manual override preserved
      expect(compAfter!.reminderLevels).toEqual([]); // levels still reset
    });
  });

  describe('derivePreSubmissionDependencies', () => {
    it('schedules thesis_submitted at completedAt + 2 months when pre_submission completes', async () => {
      const sid = new mongoose.Types.ObjectId().toString();
      await seedMilestones(sid);

      const pre = await Milestone.findOne({ student: sid, key: MilestoneKey.PRE_SUBMISSION });
      pre!.status = MilestoneStatus.COMPLETED;
      pre!.completedAt = new Date(2026, 0, 15);
      await pre!.save();

      const thesis = await Milestone.findOne({ student: sid, key: MilestoneKey.THESIS_SUBMITTED });
      expect(thesis!.dueDate).toBeUndefined();

      await derivePreSubmissionDependencies(sid, pre!.completedAt!);

      const after = await Milestone.findOne({ student: sid, key: MilestoneKey.THESIS_SUBMITTED });
      expect(after!.dueDate).toBeDefined();
      expect(after!.dateSource).toBe('manual');
      expect(after!.reminderLevels).toEqual([]);
      expect(after!.dueDate!.getFullYear()).toBe(2026);
      expect(after!.dueDate!.getMonth()).toBe(2); // Jan 15 + 2 months = Mar 15
      expect(after!.dueDate!.getDate()).toBe(15);
    });

    it('does not override an already-scheduled thesis_submitted', async () => {
      const sid = new mongoose.Types.ObjectId().toString();
      await seedMilestones(sid);

      const thesis = await Milestone.findOne({ student: sid, key: MilestoneKey.THESIS_SUBMITTED });
      thesis!.dueDate = new Date(2026, 5, 1);
      await thesis!.save();

      const pre = await Milestone.findOne({ student: sid, key: MilestoneKey.PRE_SUBMISSION });
      pre!.status = MilestoneStatus.COMPLETED;
      pre!.completedAt = new Date(2026, 0, 15);
      await pre!.save();

      await derivePreSubmissionDependencies(sid, pre!.completedAt!);

      const after = await Milestone.findOne({ student: sid, key: MilestoneKey.THESIS_SUBMITTED });
      expect(after!.dueDate!.getMonth()).toBe(5);
      expect(after!.dueDate!.getDate()).toBe(1);
    });
  });

  describe('backfillMilestoneMetadata', () => {
    it('sets missing dateSource/regulation/priority/reminderLevels on legacy docs', async () => {
      const sid = new mongoose.Types.ObjectId().toString();
      await Milestone.insertMany([
        {
          student: sid,
          key: MilestoneKey.COURSE_WORK,
          title: 'Course Work Completion',
          description: 'legacy',
          status: MilestoneStatus.PENDING,
          order: 2,
          dueDate: new Date(2026, 0, 1),
        },
        {
          student: sid,
          key: MilestoneKey.COMPREHENSIVE_EXAM,
          title: 'Comprehensive Examination',
          description: 'legacy',
          status: MilestoneStatus.PENDING,
          order: 3,
        },
      ]);

      const result = await backfillMilestoneMetadata();
      expect(result.updated).toBe(2);

      const courseWork = await Milestone.findOne({ student: sid, key: MilestoneKey.COURSE_WORK });
      expect(courseWork!.dateSource).toBe('auto');
      expect(courseWork!.regulation).toBeDefined();
      expect(courseWork!.priority).toBe('critical');
      expect(courseWork!.reminderLevels).toEqual([]);

      const comprehensive = await Milestone.findOne({ student: sid, key: MilestoneKey.COMPREHENSIVE_EXAM });
      expect(comprehensive!.dateSource).toBe('manual');
      expect(comprehensive!.priority).toBe('critical');
      expect(comprehensive!.reminderLevels).toEqual([]);

      // Guarded: a second run in the same process is a no-op.
      const second = await backfillMilestoneMetadata();
      expect(second.updated).toBe(0);
    });
  });
});
