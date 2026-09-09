import mongoose, { Schema, Document } from 'mongoose';
import { IEvent, EventType } from '../types';

export interface IEventDocument extends IEvent, Document {}

const eventParticipantSchema = new Schema(
  {
    participant: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    participantModel: { type: String, default: 'User' },
  },
  { _id: false }
);

const eventSchema = new Schema<any>(
  {
    title: { type: String, required: true, trim: true },
    eventType: { type: String, enum: Object.values(EventType), required: true },
    description: { type: String, default: '' },
    date: { type: Date, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    location: { type: String, default: '' },
    organizer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    organizerModel: { type: String, default: 'User' },
    participants: [eventParticipantSchema],
    semester: { type: Schema.Types.ObjectId, ref: 'Semester' },
    deadline: { type: Date },
    eligibilityRules: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Event = mongoose.model<IEventDocument>('Event', eventSchema);

