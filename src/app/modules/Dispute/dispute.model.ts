import { Schema, model } from 'mongoose';
import { TDispute } from './dispute.interface';

const adminNoteSchema = new Schema(
  {
    admin: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const disputeResponseSchema = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: {
      type: String,
      enum: ['admin', 'superAdmin', 'user', 'vendor'],
      required: true,
    },
    senderName: { type: String, default: '' },
    message: { type: String, required: true },
    attachments: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const disputeSchema = new Schema<TDispute>(
  {
    disputeId: { type: String, unique: true },
    disputer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    respondent: { type: Schema.Types.ObjectId, ref: 'User' },
    disputeAbout: {
      type: String,
      enum: [
        'A Vendor',
        'A Customer',
        'Another Vendor',
        'WePlan Expert Service',
        'Other',
      ],
      default: 'Other',
    },
    subject: { type: String, required: true },
    title: { type: String }, // Legacy compatibility
    issueType: {
      type: String,
      enum: [
        'Service Issue',
        'Payment Issue',
        'Communication or Behaviour',
        'Other',
        'service',
        'payment',
        'message',
      ],
      default: 'Service Issue',
    },
    disputeType: { type: String }, // Legacy compatibility
    otherPartyName: { type: String, default: '' },
    otherPartyContact: { type: String, default: '' },
    otherPartyProfileLink: { type: String, default: '' },
    bookingId: { type: String },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    description: { type: String, required: true },
    evidence: { type: [String], default: [] },
    status: {
      type: String,
      enum: [
        'submitted',
        'under_review',
        'closed',
        'pending',
        'open',
        'resolved',
        'rejected',
      ],
      default: 'submitted',
    },
    closingResponse: { type: String },
    closedAt: { type: Date },
    closedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    responses: {
      type: [disputeResponseSchema],
      default: [],
    },
    adminNotes: {
      type: [adminNoteSchema],
      select: false,
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// ── Auto-generate disputeId & sync fields ──
disputeSchema.pre('save', async function (next) {
  if (this.isNew && !this.disputeId) {
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

  // Sync subject and title
  if (this.subject && !this.title) {
    this.title = this.subject;
  } else if (this.title && !this.subject) {
    this.subject = this.title;
  }

  // Sync issueType and disputeType
  if (this.issueType && !this.disputeType) {
    this.disputeType = this.issueType;
  } else if (this.disputeType && !this.issueType) {
    this.issueType = this.disputeType;
  }

  next();
});

disputeSchema.index({ status: 1, createdAt: -1 });
disputeSchema.index({ disputer: 1, createdAt: -1 });

export const Dispute = model<TDispute>('Dispute', disputeSchema);
