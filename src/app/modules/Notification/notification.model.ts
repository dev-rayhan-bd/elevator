import { Schema, model, Types } from 'mongoose';

const notificationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: [
      'vendor_approved', 'vendor_rejected', 'profile_score_changed',
      'profile_visibility_changed', 'new_review', 'vendor_application',
      'new_vendor_registered', 'vendor_verification', 'availability_update',
      'booking_update'
    ], 
    default: 'general' 
  },
  isRead: { type: Boolean, default: false },
  /** Optional structured payload for deep-linking and client logic */
  data: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export const NotificationModel = model('Notification', notificationSchema);