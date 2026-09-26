import { Schema, model } from 'mongoose';
import { TInspirationCategory } from './inspirationCategory.interface';

const inspirationCategorySchema = new Schema<TInspirationCategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    image: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const InspirationCategory = model<TInspirationCategory>(
  'InspirationCategory',
  inspirationCategorySchema,
);
