import { Schema, model } from 'mongoose';
import { TContactUs, TContactStatus } from './contact.interface';

const contactSchema = new Schema<TContactUs>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'replied', 'closed'],
      default: 'pending',
    },
    replyMessage: {
      type: String,
    },
    repliedAt: {
      type: Date,
    },
    repliedBy: {
      type: String,
    },
  },
  { timestamps: true }
);

export const ContactUs = model<TContactUs>('ContactUs', contactSchema);
