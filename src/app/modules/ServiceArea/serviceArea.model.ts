import { Schema, model } from 'mongoose';
import { TServiceArea } from './serviceArea.interface';

const serviceAreaSchema = new Schema<TServiceArea>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    region: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

serviceAreaSchema.index({ order: 1 });

export const ServiceArea = model<TServiceArea>('ServiceArea', serviceAreaSchema);
