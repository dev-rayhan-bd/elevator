import { Types } from 'mongoose';

export type TEventRequestStatus = 'active' | 'closed' | 'cancelled' | 'expired';

export interface TEventRequest {
  user: Types.ObjectId;
  eventType?: Types.ObjectId;
  eventDate: Date;
  guestCount?: number;
  budgetMin?: number;
  budgetMax?: number;
  area: Types.ObjectId;
  serviceCategory: Types.ObjectId;
  additionalDetails?: string;
  referenceImages?: string[];
  status: TEventRequestStatus;
}
