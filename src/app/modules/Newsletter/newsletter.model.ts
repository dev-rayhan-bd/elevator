import { Schema, model } from 'mongoose';
import { INewsletter } from './newsletter.interface';

const newsletterSchema = new Schema<INewsletter>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['active', 'unsubscribed', 'blocked'],
      default: 'active',
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    unsubscribedAt: {
      type: Date,
    },
    source: {
      type: String,
      enum: ['web', 'admin', 'import'],
      default: 'web',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

newsletterSchema.index({ email: 1 }, { unique: true });
newsletterSchema.index({ status: 1 });
newsletterSchema.index({ user: 1 });
newsletterSchema.index({ isDeleted: 1 });
newsletterSchema.index({ tags: 1 });

export const Newsletter = model<INewsletter>('Newsletter', newsletterSchema);
