import { Schema, model } from 'mongoose';
import { TReview } from './review.interface';

const reviewSchema = new Schema<TReview>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  vendor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: Schema.Types.ObjectId, ref: 'VendorService', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

// One review per user per vendor-service combination
reviewSchema.index({ user: 1, service: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

export const Review = model<TReview>('Review', reviewSchema);