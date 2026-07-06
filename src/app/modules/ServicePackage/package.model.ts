import { Schema, model } from 'mongoose';
import { TServicePackage } from './package.interface';

const servicePackageSchema = new Schema<TServicePackage>(
  {
    vendor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    packageType: {
      type: String,
      enum: ['basic', 'standard', 'premium'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    // deliveryTime: { type: String, required: true, trim: true },
    // revisions: { type: Number, required: true, min: 0 },
    features: [{ type: Schema.Types.ObjectId, ref: 'VendorService' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// A vendor can only have one package of each type (basic, standard, premium)
servicePackageSchema.index(
  { vendor: 1, packageType: 1 },
  { unique: true },
);

export const ServicePackage = model<TServicePackage>(
  'ServicePackage',
  servicePackageSchema,
);
