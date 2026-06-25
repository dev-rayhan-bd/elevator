import { Schema, model } from 'mongoose';
import { TVendorService } from './vendorService.interface';

const vendorServiceSchema = new Schema<TVendorService>(
  {
    vendor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
    subcategory: { type: Schema.Types.ObjectId, ref: 'ServiceSubcategory', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    pricingType: {
      type: String,
      enum: ['fixed', 'hourly', 'negotiable'],
      required: true,
    },
    price: { type: Number, required: true, min: 0 },
    discountedPrice: { type: Number, min: 0 },
    amenities: [{ type: Schema.Types.ObjectId, ref: 'Amenity' }],
    serviceAreas: [{ type: Schema.Types.ObjectId, ref: 'ServiceArea' }],
    images: [{ type: String }],
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Indexes for common queries
vendorServiceSchema.index({ vendor: 1, isActive: 1 });
vendorServiceSchema.index({ category: 1 });
vendorServiceSchema.index({ subcategory: 1 });

export const VendorService = model<TVendorService>('VendorService', vendorServiceSchema);
