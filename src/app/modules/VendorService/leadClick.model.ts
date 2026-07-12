import { Schema, model } from 'mongoose';
import { TLeadClick } from './leadClick.interface';

const leadClickSchema = new Schema<TLeadClick>(
  {
    vendor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['whatsapp', 'phone', 'message'], required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    service: { type: Schema.Types.ObjectId, ref: 'VendorService' },
    pageSource: {
      type: String,
      enum: ['profile_page', 'package_details', 'portfolio_gallery', 'pricing_page', 'contact_page', 'service_page', 'other'],
      default: 'other',
    },
    status: {
      type: String,
      enum: ['clicked_only', 'converted'],
      default: 'clicked_only',
    },
  },
  { timestamps: true },
);

// ── Indexes ──
leadClickSchema.index({ vendor: 1, createdAt: -1 });
leadClickSchema.index({ vendor: 1, type: 1 });
leadClickSchema.index({ user: 1, vendor: 1 });

export const LeadClick = model<TLeadClick>('LeadClick', leadClickSchema);
