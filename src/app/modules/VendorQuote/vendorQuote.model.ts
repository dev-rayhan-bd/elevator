import { Schema, model } from 'mongoose';
import { TVendorQuote } from './vendorQuote.interface';

const vendorQuoteSchema = new Schema<TVendorQuote>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vendor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    service: { type: Schema.Types.ObjectId, ref: 'VendorService', required: true },
    eventType: { type: Schema.Types.ObjectId, ref: 'EventType' },
    pricingType: {
      type: String,
      enum: ['fixed', 'starting from', 'per head'],
      required: true,
    },
    eventDate: { type: Date, required: true },
    guestCount: { type: Number, min: 1 },
    message: { type: String, required: true, trim: true },
    budget: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'countered', 'accepted', 'declined', 'won', 'lost'],
      default: 'pending',
    },
    offers: [
      {
        amount: { type: Number, required: true },
        message: { type: String },
        sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        pricingType: { type: String, enum: ['fixed', 'starting from', 'per head'] },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    finalAmount: { type: Number },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual field to map internal status to simple user-friendly displayStatus ('active' | 'closed')
vendorQuoteSchema.virtual('displayStatus').get(function (this: TVendorQuote) {
  if (['pending', 'countered'].includes(this.status)) {
    return 'active';
  }
  return 'closed';
});

// One quote per user per service (active ones only)
vendorQuoteSchema.index(
  { user: 1, service: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
vendorQuoteSchema.index({ vendor: 1, status: 1 });
vendorQuoteSchema.index({ user: 1, status: 1 });
vendorQuoteSchema.index({ eventType: 1 });

export const VendorQuote = model<TVendorQuote>('VendorQuote', vendorQuoteSchema);
