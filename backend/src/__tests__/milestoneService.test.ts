import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  seedMilestones,
  getMilestones,
  updateMilestone,
  DEFAULT_MILESTONES,
} from '../services/milestoneService';
import { Milestone } from '../models/Milestone';
import { MilestoneStatus } from '../types';

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
  });
});
