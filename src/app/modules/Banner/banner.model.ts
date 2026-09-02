import { Schema, model } from 'mongoose';
import { TBanner, TBannerSlot, TBannerTracking } from './banner.interface';

// ── Banner Slot Schema (Admin-managed pricing & slots) ──
const bannerSlotSchema = new Schema<TBannerSlot>(
  {
    slotType: {
      type: String,
      required: true,
      unique: true,
      enum: ['hero_main_week', 'hero_main_month'],
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    durationDays: { type: Number, required: true, min: 1 },
    dimensions: { type: String, trim: true },
    maxActive: { type: Number, default: 1, min: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

bannerSlotSchema.index({ slotType: 1 }, { unique: true });

// ── Banner Schema (Vendor bookings) ──
const bannerSchema = new Schema<TBanner>(
  {
    vendor: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    slot: { type: Schema.Types.ObjectId, ref: 'BannerSlot', required: true },
    title: { type: String, required: true, trim: true },
    image: { type: String, required: true },
    link: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    price: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'expired'],
      default: 'pending',
    },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createdByType: { type: String, enum: ['admin', 'vendor'], default: 'vendor' },
    impressions: { type: Number, default: 0, min: 0 },
    clicks: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

bannerSchema.index({ vendor: 1 });
bannerSchema.index({ slot: 1 });
bannerSchema.index({ status: 1 });
bannerSchema.index({ endDate: 1 });
bannerSchema.index({ isDeleted: 1 });
bannerSchema.index({ isActive: 1, status: 1, endDate: 1 });

// ── Banner Tracking Schema (per-IP cooldown) ──
const bannerTrackingSchema = new Schema<TBannerTracking>(
  {
    banner: { type: Schema.Types.ObjectId, ref: 'Banner', required: true },
    ip: { type: String, required: true },
    type: { type: String, enum: ['impression', 'click'], required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

bannerTrackingSchema.index({ banner: 1, ip: 1, type: 1 });
bannerTrackingSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // TTL 30 days

export const BannerSlot = model<TBannerSlot>('BannerSlot', bannerSlotSchema);
export const Banner = model<TBanner>('Banner', bannerSchema);
export const BannerTracking = model<TBannerTracking>('BannerTracking', bannerTrackingSchema);
