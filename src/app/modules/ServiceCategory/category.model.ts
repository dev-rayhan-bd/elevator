import { Schema, model } from 'mongoose';
import { TServiceCategory } from './category.interface';

const categorySchema = new Schema<TServiceCategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    image: { type: String },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

categorySchema.index({ order: 1 });

export const ServiceCategory = model<TServiceCategory>('ServiceCategory', categorySchema);
