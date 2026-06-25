import { Schema, model } from 'mongoose';
import { TServiceArea } from './serviceArea.interface';

const serviceAreaSchema = new Schema<TServiceArea>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    region: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const ServiceArea = model<TServiceArea>('ServiceArea', serviceAreaSchema);
