import { Schema, model } from 'mongoose';
import { TVerification } from './verification.interface';

const verificationSchema = new Schema<TVerification>(
  {
    vendor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    documents: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    notes: { type: String, trim: true },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: { type: Date },
    rejectedReason: { type: String, trim: true },
  },
  { timestamps: true },
);

verificationSchema.index({ vendor: 1 }, { unique: true });
verificationSchema.index({ status: 1 });

export const Verification = model<TVerification>(
  'Verification',
  verificationSchema,
);
