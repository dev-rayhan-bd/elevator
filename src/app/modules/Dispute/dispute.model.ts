import { Schema, model } from 'mongoose';
import { TDispute } from './dispute.interface';

const adminNoteSchema = new Schema(
  {
    admin: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const disputeSchema = new Schema<TDispute>(
  {
    disputeId: { type: String, unique: true },
    disputer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    respondent: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bookingId: { type: String },
    disputeType: {
      type: String,
      enum: ['service', 'payment', 'message'],
      required: true,
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    evidence: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['pending', 'open', 'under_review', 'resolved', 'rejected'],
      default: 'pending',
    },
    adminNotes: {
      type: [adminNoteSchema],
      select: false,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// ── Auto-generate disputeId (e.g., "DSP-001") ──
disputeSchema.pre('save', async function (next) {
  if (this.isNew) {
    const last = await (this.constructor as any)
      .findOne({}, { disputeId: 1 })
      .sort({ createdAt: -1 })
      .lean();

    let nextNum = 1;
    if (last?.disputeId) {
      const match = last.disputeId.match(/DSP-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    this.disputeId = `DSP-${String(nextNum).padStart(3, '0')}`;
  }
  next();
});

disputeSchema.index({ status: 1, priority: -1, createdAt: -1 });

export const Dispute = model<TDispute>('Dispute', disputeSchema);
