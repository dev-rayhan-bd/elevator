import { Schema, model } from 'mongoose';
import { TEventType } from './eventType.interface';

const eventTypeSchema = new Schema<TEventType>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    image: { type: String },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

eventTypeSchema.index({ order: 1 });
eventTypeSchema.index({ isActive: 1, order: 1 });

export const EventType = model<TEventType>('EventType', eventTypeSchema);
