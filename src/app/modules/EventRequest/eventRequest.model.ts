import { Schema, model } from 'mongoose';
import { TEventRequest } from './eventRequest.interface';

const eventRequestSchema = new Schema<TEventRequest>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventType: { type: Schema.Types.ObjectId, ref: 'EventType' },
    eventDate: { type: Date, required: true },
    guestCount: { type: Number, min: 1 },
    budgetMin: { type: Number, min: 0 },
    budgetMax: { type: Number, min: 0 },
    area: { type: Schema.Types.ObjectId, ref: 'ServiceArea', required: true },
    serviceCategory: { type: Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
    additionalDetails: { type: String, trim: true },
    referenceImages: [{ type: String }],
    status: {
      type: String,
      enum: ['active', 'closed', 'cancelled'],
      default: 'active',
    },
  },
  { timestamps: true },
);

eventRequestSchema.index({ user: 1, status: 1 });
eventRequestSchema.index({ status: 1, createdAt: -1 });

export const EventRequest = model<TEventRequest>('EventRequest', eventRequestSchema);
