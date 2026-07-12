import { Schema, model } from 'mongoose';
import {
  TPromotionPlanConfig,
  TVendorPromotion,
} from './promotion.interface';

// ── Promotion Plan Schema (Admin-managed tiers) ──
// Each promotion category can have multiple duration tiers
const promotionPlanSchema = new Schema<TPromotionPlanConfig>(
  {
    promotionCategory: {
      type: String,
      required: true,
      enum: ['sponsored', 'featured', 'inspiration', 'verified'],
    },
    durationTitle: { type: String, required: true, trim: true },
    durationDays: { type: Number, required: true, min: 1 },
    originalPrice: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, required: true, min: 0, max: 100 },
    price: { type: Number, required: true, min: 0 },
    isPopular: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// One tier per (category + durationDays) combination
promotionPlanSchema.index({ promotionCategory: 1, durationDays: 1 }, { unique: true });

// ── Vendor Promotion Schema (purchased promotions) ──
const vendorPromotionSchema = new Schema<TVendorPromotion>(
  {
    vendor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: 'VendorService',
    },
    plan: {
      type: Schema.Types.ObjectId,
      ref: 'PromotionPlan',
      required: true,
    },
    promotionCategory: {
      type: String,
      enum: ['sponsored', 'featured', 'inspiration', 'verified'],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0 },
    isActive: { type: Boolean, default: true },
    isPostCreated: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['pending', 'active', 'expired', 'cancelled'],
      default: 'active',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending',
    },
    impressions: { type: Number, default: 0, min: 0 },
    clicks: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

vendorPromotionSchema.index({ vendor: 1 });
vendorPromotionSchema.index({ service: 1 });
vendorPromotionSchema.index({ plan: 1 });
vendorPromotionSchema.index({ promotionCategory: 1 });
vendorPromotionSchema.index({ status: 1 });
vendorPromotionSchema.index({ endDate: 1 });
vendorPromotionSchema.index({ isActive: 1, status: 1 });

export const PromotionPlan = model<TPromotionPlanConfig>(
  'PromotionPlan',
  promotionPlanSchema,
);
export const VendorPromotion = model<TVendorPromotion>(
  'VendorPromotion',
  vendorPromotionSchema,
);
