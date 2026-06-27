import { Schema, model } from 'mongoose';
import { TEventQuote } from './eventQuote.interface';

const quoteOfferSchema = new Schema<TEventQuote['offers'][number]>(
  {
    amount: { type: Number, required: true, min: 0 },
    message: { type: String, trim: true },
    sentBy: { type: String, enum: ['vendor', 'user'], required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const eventQuoteSchema = new Schema<TEventQuote>(
  {
    eventRequest: { type: Schema.Types.ObjectId, ref: 'EventRequest', required: true },
    vendor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    quoteAmount: { type: Number, required: true, min: 0 },
    message: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'countered', 'accepted', 'declined', 'won', 'lost'],
      default: 'pending',
    },
    counterOffer: {
      amount: { type: Number, min: 0 },
      message: { type: String, trim: true },
      sentBy: { type: String, enum: ['vendor', 'user'] },
    },
    offers: [quoteOfferSchema],
    validUntil: { type: Date },
  },
  { timestamps: true },
);

// Prevent duplicate quotes from same vendor on same request
eventQuoteSchema.index({ eventRequest: 1, vendor: 1 }, { unique: true });
eventQuoteSchema.index({ vendor: 1, status: 1 });
eventQuoteSchema.index({ eventRequest: 1, status: 1 });

export const EventQuote = model<TEventQuote>('EventQuote', eventQuoteSchema);
