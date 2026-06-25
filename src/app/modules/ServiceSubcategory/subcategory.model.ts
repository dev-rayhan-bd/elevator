import { Schema, model } from 'mongoose';
import { TServiceSubcategory } from './subcategory.interface';

const subcategorySchema = new Schema<TServiceSubcategory>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
    description: { type: String, trim: true },
    image: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Index for fast lookup by category
subcategorySchema.index({ category: 1 });

export const ServiceSubcategory = model<TServiceSubcategory>('ServiceSubcategory', subcategorySchema);
