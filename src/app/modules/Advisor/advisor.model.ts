import { Schema, model } from 'mongoose';
import { IAdvisorService, IAdvisorBooking } from './advisor.interface';

// ══════════════════════════════════════════════
//  ADVISOR SERVICE SCHEMA
// ══════════════════════════════════════════════

const advisorServiceSchema = new Schema<IAdvisorService>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

advisorServiceSchema.index({ isActive: 1 });

export const AdvisorService = model<IAdvisorService>(
  'AdvisorService',
  advisorServiceSchema,
);

// ══════════════════════════════════════════════
//  ADVISOR BOOKING SCHEMA
// ══════════════════════════════════════════════

const advisorBookingSchema = new Schema<IAdvisorBooking>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    advisorService: {
      type: Schema.Types.ObjectId,
      ref: 'AdvisorService',
      required: true,
    },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    weddingDate: { type: Date, required: true },
    weddingLocation: { type: String, required: true, trim: true },
    budget: { type: Number, required: true, min: 0 },
    guestCount: { type: Number, required: true, min: 1 },
    specialRequirements: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    assignedAssociate: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedAt: { type: Date },
    completedAt: { type: Date },
    cancellationReason: { type: String, trim: true },
    adminNotes: { type: String, trim: true },
  },
  { timestamps: true },
);

advisorBookingSchema.index({ advisorService: 1, status: 1 });
advisorBookingSchema.index({ status: 1, createdAt: -1 });
advisorBookingSchema.index({ assignedAssociate: 1, status: 1 });
advisorBookingSchema.index({ email: 1 });

export const AdvisorBooking = model<IAdvisorBooking>(
  'AdvisorBooking',
  advisorBookingSchema,
);
