import mongoose from 'mongoose';
import { IRefundPolicy } from './RefundPolicy.interface';

export const refundPolicySchema = new mongoose.Schema<IRefundPolicy>(
  {
    refundPolicy: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

const RefundPolicy = mongoose.model<IRefundPolicy>('RefundPolicy', refundPolicySchema);
export default RefundPolicy;
