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

// Indexes for common queries
vendorServiceSchema.index({ vendor: 1, isActive: 1 });
vendorServiceSchema.index({ vendor: 1, isDraft: 1 });
vendorServiceSchema.index({ category: 1 });
vendorServiceSchema.index({ subcategory: 1 });

export const VendorService = model<TVendorService>('VendorService', vendorServiceSchema);
