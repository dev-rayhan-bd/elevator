import { Schema, model } from 'mongoose';
import { TVendorService } from './vendorService.interface';

const vendorServiceSchema = new Schema<TVendorService>(
  {
    vendor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'ServiceCategory',
      required: function (this: { isDraft?: boolean }) {
        return !this.isDraft;
      },
    },
    subcategory: {
      type: Schema.Types.ObjectId,
      ref: 'ServiceSubcategory',
      required: function (this: { isDraft?: boolean }) {
        return !this.isDraft;
      },
    },
    title: {
      type: String,
      trim: true,
      required: function (this: { isDraft?: boolean }) {
        return !this.isDraft;
      },
    },
    description: {
      type: String,
      trim: true,
      required: function (this: { isDraft?: boolean }) {
        return !this.isDraft;
      },
    },
    pricingType: {
      type: String,
      enum: ['fixed', 'starting from', 'per head'],
      required: function (this: { isDraft?: boolean }) {
        return !this.isDraft;
      },
    },
    price: {
      type: Number,
      min: 0,
      required: function (this: { isDraft?: boolean }) {
        return !this.isDraft;
      },
    },
    guestCapacity: {
      type: Number,
      min: 1,
      required: function (this: { isDraft?: boolean }) {
        return !this.isDraft;
      },
    },
    eventTypes: [{ type: Schema.Types.ObjectId, ref: 'EventType' }],
    serviceAreas: [{ type: Schema.Types.ObjectId, ref: 'ServiceArea' }],
    amenities: [{ type: Schema.Types.ObjectId, ref: 'Amenity' }],
    images: [{ type: String }],
    termsAndCondition: {
      type: String,
      trim: true,
      required: function (this: { isDraft?: boolean }) {
        return !this.isDraft;
      },
    },
    isActive: { type: Boolean, default: true },
    isDraft: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// ── Compound indexes for fast public search ──
vendorServiceSchema.index({ isActive: 1, isDraft: 1, category: 1 });
vendorServiceSchema.index({ isActive: 1, isDraft: 1, subcategory: 1 });
vendorServiceSchema.index({ isActive: 1, isDraft: 1, eventTypes: 1 });
vendorServiceSchema.index({ isActive: 1, isDraft: 1, price: 1 });
vendorServiceSchema.index({ isActive: 1, isDraft: 1, createdAt: -1 });
// ── Vendor-specific queries ──
vendorServiceSchema.index({ vendor: 1, isActive: 1 });
// ── Karachi Venue Map — aggregation support indexes ──
vendorServiceSchema.index({ isActive: 1, isDraft: 1, guestCapacity: 1 });
vendorServiceSchema.index({ isActive: 1, isDraft: 1, amenities: 1 });
vendorServiceSchema.index({ isActive: 1, isDraft: 1, price: 1, guestCapacity: 1 });
vendorServiceSchema.index({ isActive: 1, isDraft: 1, serviceAreas: 1 });
vendorServiceSchema.index({ vendor: 1, isDraft: 1 });

export const VendorService = model<TVendorService>('VendorService', vendorServiceSchema);
