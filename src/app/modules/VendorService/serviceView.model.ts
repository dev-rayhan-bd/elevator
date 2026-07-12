import { Schema, model } from 'mongoose';
import { TServiceView } from './serviceView.interface';

const serviceViewSchema = new Schema<TServiceView>(
  {
    vendor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    service: { type: Schema.Types.ObjectId, ref: 'VendorService' },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: ['profile', 'service'],
      default: 'service',
    },
    ip: { type: String },
    userAgent: { type: String },
    referrer: { type: String },
    isUnique: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// ── Indexes ──
serviceViewSchema.index({ vendor: 1, createdAt: -1 });
serviceViewSchema.index({ vendor: 1, type: 1, createdAt: -1 });
serviceViewSchema.index({ service: 1, createdAt: -1 });
serviceViewSchema.index({ vendor: 1, ip: 1, type: 1, createdAt: -1 });
serviceViewSchema.index({ vendor: 1, type: 1, isUnique: 1, createdAt: -1 });

export const ServiceView = model<TServiceView>('ServiceView', serviceViewSchema);
