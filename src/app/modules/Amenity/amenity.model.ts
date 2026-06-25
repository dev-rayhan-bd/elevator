import { Schema, model } from 'mongoose';
import { TAmenity } from './amenity.interface';

const amenitySchema = new Schema<TAmenity>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    icon: { type: String },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    category: { type: Schema.Types.ObjectId, ref: 'ServiceCategory' },
    subcategory: { type: Schema.Types.ObjectId, ref: 'ServiceSubcategory' },
  },
  { timestamps: true },
);

amenitySchema.index({ category: 1 });
amenitySchema.index({ subcategory: 1 });

export const Amenity = model<TAmenity>('Amenity', amenitySchema);
