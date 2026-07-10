import { Schema, model } from 'mongoose';
import { IAdvisorService, IAdvisorBooking, IAdvisorReview } from './advisor.interface';

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
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
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

// ══════════════════════════════════════════════
//  ADVISOR REVIEW SCHEMA
// ══════════════════════════════════════════════

const advisorReviewSchema = new Schema<IAdvisorReview>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    advisorService: {
      type: Schema.Types.ObjectId,
      ref: 'AdvisorService',
      required: true,
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'AdvisorBooking',
      required: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// One review per user per advisor-service (soft-delete aware)
advisorReviewSchema.index(
  { user: 1, advisorService: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

advisorReviewSchema.index({ advisorService: 1, isDeleted: 1 });

export const AdvisorReview = model<IAdvisorReview>(
  'AdvisorReview',
  advisorReviewSchema,
);
