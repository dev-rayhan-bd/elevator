import { Schema, model } from 'mongoose';
import { TLeadClick } from './leadClick.interface';

const leadClickSchema = new Schema<TLeadClick>(
  {
    vendor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['whatsapp', 'phone', 'message'], required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const LeadClick = model<TLeadClick>('LeadClick', leadClickSchema);
