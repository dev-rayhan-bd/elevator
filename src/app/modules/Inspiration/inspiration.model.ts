import { Schema, model } from 'mongoose';
import { TInspiration } from './inspiration.interface';

const inspirationSchema = new Schema<TInspiration>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
    },
    price: {
      type: String,
      required: true,
      trim: true,
    },
    vendor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient querying
inspirationSchema.index({ isActive: 1 });
inspirationSchema.index({ vendor: 1 });
inspirationSchema.index({ createdAt: -1 });
inspirationSchema.index({ title: 'text', description: 'text' });

export const Inspiration = model<TInspiration>('Inspiration', inspirationSchema);
