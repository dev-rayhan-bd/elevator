import { Schema, model } from 'mongoose';
import { TEventType } from './eventType.interface';

const eventTypeSchema = new Schema<TEventType>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    image: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const EventType = model<TEventType>('EventType', eventTypeSchema);
